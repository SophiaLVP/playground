// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

import { Color } from 'base/color.js';
import { BalancedTeamsResolver } from 'features/games_deathmatch/teams/balanced_teams_resolver.js';
import { DeathmatchPlayerState } from 'features/games_deathmatch/deathmatch_player_state.js';
import { FreeForAllResolver } from 'features/games_deathmatch/teams/free_for_all_resolver.js';
import { GameBase } from 'features/games/game_base.js';
import { RandomizedTeamsResolver } from 'features/games_deathmatch/teams/randomized_teams_resolver.js';

// Colours that will be assigned to participants of certain teams.
const kTeamColorAlpha = Color.fromHex('D84315AA');  // red
const kTeamColorBravo = Color.fromHex('0277BDAA');  // blue

// Implementation of the `Game` interface which extends it with deathmatch-related functionality. It
// exposes methods that should be called before game-specific behaviour, i.e. through super calls.
export class DeathmatchGame extends GameBase {
    // Values for map marker visibility for the participants.
    static kMapMarkersEnabled = 'Enabled';
    static kMapMarkersEnabledTeam = 'Team only';
    static kMapMarkersDisabled = 'Disabled';

    // The objective which defines the winning conditions of this game.
    static kObjectiveLastManStanding = 'Last man standing';
    static kObjectiveBestOf = 'Best of...';
    static kObjectiveFirstTo = 'First to...';
    static kObjectiveTimeLimit = 'Time limit...';
    static kObjectiveContinuous = 'Continuous';

    // Indicates which team a player can be part of. Individuals are always part of team 0, whereas
    // players can be part of either Team Alpha or Team Bravo in team-based games.
    static kTeamIndividual = 0;
    static kTeamAlpha = 0;
    static kTeamBravo = 1;

    // Values for how teams should be divided in this game. Defaults to free for all, but can be
    // anything. Players will be divided before the first player spawns.
    static kTeamsBalanced = 'Balanced teams';
    static kTeamsFreeForAll = 'Free for all';
    static kTeamsRandomized = 'Randomized teams';

    #lagCompensation_ = null;
    #mapMarkers_ = DeathmatchGame.kMapMarkersEnabled;
    #objective_ = null;
    #skin_ = null;
    #spawnArmour_ = null;
    #spawnWeapons_ = null;
    #teamDamage_ = null;
    #teamResolved_ = false;
    #teamResolver_ = null;

    // Map of Player instance to DeathmatchPlayerState instance for all participants.
    #state_ = new Map();

    // ---------------------------------------------------------------------------------------------

    // Returns whether teams will be used for this game.
    isTeamBased() { return this.#teamResolver_.isTeamBased(); }

    // Returns a PlayerStatsView instance for the current statistics of the given |player|. An
    // exception will be thrown if the |player| has not had their state initialized yet.
    getStatisticsForPlayer(player) {
        const state = this.#state_.get(player);
        if (!state || !state.statistics)
            throw new Error(`The given player (${player}) isn't part of this game anymore.`);

        return player.stats.diff(state.statistics);
    }

    // Gets the team that the given |player| is part of. Will be one of the DeathmatchGame.kTeam*
    // constants, and always be kTeamIndividual for non-team based games.
    getTeamForPlayer(player) {
        if (!this.isTeamBased())
            return DeathmatchGame.kTeamIndividual;

        const state = this.#state_.get(player);
        if (!state || state.team === null)
            throw new Error(`The given player (${player}) has not been assigned a team yet.`);

        return state.team;
    }

    // ---------------------------------------------------------------------------------------------

    async onInitialized(settings) {
        await super.onInitialized(settings);

        // Import the settings from the |settings|, which may have been customised by the player.
        this.#lagCompensation_ = settings.get('deathmatch/lag_compensation');
        this.#skin_ = settings.get('deathmatch/skin');
        this.#spawnArmour_ = settings.get('deathmatch/spawn_armour');
        this.#spawnWeapons_ = settings.get('deathmatch/spawn_weapons');
        this.#teamDamage_ = settings.get('deathmatch/team_damage');

        this.#mapMarkers_ = settings.get('deathmatch/map_markers');
        switch (this.#mapMarkers_) {
            case DeathmatchGame.kMapMarkersEnabled:
            case DeathmatchGame.kMapMarkersEnabledTeam:
            case DeathmatchGame.kMapMarkersDisabled:
                break;

            default:
                throw new Error('Invalid value given for map markers: ' + this.#mapMarkers_);
        }

        this.#objective_ = settings.get('deathmatch/objective');
        switch (this.#objective_.type) {
            case DeathmatchGame.kObjectiveLastManStanding:
            case DeathmatchGame.kObjectiveBest:
            case DeathmatchGame.kObjectiveFirstTo:
            case DeathmatchGame.kObjectiveTimeLimit:
            case DeathmatchGame.kObjectiveContinuous:
                break;
            
            default:
                throw new Error('Invalid value given for the objective: ' + this.#objective_.type);
        }

        switch (settings.get('deathmatch/teams')) {
            case DeathmatchGame.kTeamsBalanced:
                this.#teamResolver_ = new BalancedTeamsResolver();
                break;

            case DeathmatchGame.kTeamsFreeForAll:
                this.#teamResolver_ = new FreeForAllResolver();
                break;

            case DeathmatchGame.kTeamsRandomized:
                this.#teamResolver_ = new RandomizedTeamsResolver();
                break;
            
            default:
                throw new Error('Invalid value given for the team resolver.');
        }
    }

    // Called when the given |player| is being added to the game. We prepare their de facto state,
    // and get them in order before they're going to spawn in the game's world.
    async onPlayerAdded(player) {
        await super.onPlayerAdded(player);

        // Initialize and store the |player|'s current state.
        this.#state_.set(player, new DeathmatchPlayerState(player));

        // Disable lag compensation for the |player| when this has been configured.
        if (!this.#lagCompensation_)
            player.syncedData.lagCompensationMode = /* disabled= */ 0;

        // Force the |player| in this game's skin when it has been requested.
        if (this.#skin_ >= 0)
            player.skin = this.#skin_;

        // For free-for-all games, this is the point where map marker visibility will be decided.
        // For team-based games, it will be done when the player's assigned a team instead.
        if (!this.isTeamBased())
            this.applyMapMarkerSettingForPlayer(player);
        else if (this.#teamResolved_)
            this.resolveTeamForPlayer(player);
    }

    // Called when the given |player| is spawning into the world. Here they will be assigned their
    // spawn armour and weapons, setting them up for the fight.
    async onPlayerSpawned(player, countdown) {
        if (!this.#teamResolved_)
            this.resolveTeams();

        await super.onPlayerSpawned(player, countdown);

        // Award the player with spawn armour if that has been configured.
        if (this.#spawnArmour_)
            player.armour = 100;

        // Award the player with each of the spawn weapons that they should be getting.
        for (const { weapon, ammo } of this.#spawnWeapons_)
            player.giveWeapon(weapon, ammo);
    }

    // Called when the given |player| has been removed from the game, either because they've lost,
    // they executed the "/leave" command, or because they disconnected from the server.
    async onPlayerRemoved(player) {
        await super.onPlayerRemoved(player);

        const state = this.#state_.get(player);

        // Reset the modified state for each of the game settings back to their original values for
        // the given |player|. This makes sure we don't permanently alter their state.
        this.resetMapMarkerSettingForPlayer(player, state);
        this.resetTeamColorSettingForPlayer(player, state);
        this.resetTeamDamageSettingForPlayer(player, state);

        // Reset the player back to their original skin if we had changed it.
        if (this.#skin_ >= 0)
            player.skin = state.originalSkin;

        // Flip lag compensation back to its default value if it was modified.
        if (!this.#lagCompensation_)
            player.syncedData.lagCompensationMode = Player.kDefaultLagCompensationMode;
        
        // Finally, clear the player-specific state we had stored in this game.
        this.#state_.delete(player);
    }

    // ---------------------------------------------------------------------------------------------
    // Section: Teams
    // ---------------------------------------------------------------------------------------------

    // Resolves the participants into teams. This will be done right after all participants joined,
    // but before any of them spawn. People joining the game late will be resolved separately.
    resolveTeams() {
        const resolution = this.#teamResolver_.resolve(this.players);

        // Iteration (1): apply the appropriate team colours for the |player|.
        for (const { player, team } of resolution)
            this.applyTeamColorSettingForPlayer(player, team);

        // Iteration (2): apply all the remaining settings and store state for the |player|.
        for (const { player, team } of resolution)
            this.resolveTeamForPlayer(player, team);

        this.#teamResolved_ = true;
    }

    // Resolves the proper team for |player|. If |team| is given it's during initial initialization,
    // otherwise the |player| joined late and we have to decide it for them here.
    resolveTeamForPlayer(player, team = null) {
        const state = this.#state_.get(player);
        if (!state)
            throw new Error(`The given player (${player}) has no state in this game.`);

        // If a |team| parameter was given, use that. Alternatively decide the team here.
        state.team = team ?? this.#teamResolver_.resolveForPlayer(player);

        // Activate team colours if this is a new player, and both damage and map marker settings
        // for the |player|, both initial and new participants.
        if (team === null)
            this.applyTeamColorSettingForPlayer(player, state.team);

        this.applyTeamDamageSettingForPlayer(player);
        this.applyMapMarkerSettingForPlayer(player);
    }

    // ---------------------------------------------------------------------------------------------
    // Section: Map markers
    // ---------------------------------------------------------------------------------------------

    // Applies the map marker setting for the given |player|. It has three modes, either enabled for
    // all (default), enabled for team only, and disabled for everyone.
    applyMapMarkerSettingForPlayer(player) {
        const state = this.#state_.get(player);

        const invisiblePlayers = [];
        const visiblePlayers = [];

        // (1) Divide the participants in two lists: those which should be visible for the |player|,
        // and those who should be invisible to the player.
        switch (this.#mapMarkers_) {
            case DeathmatchGame.kMapMarkersEnabled:
                return;  // nothing to update

            case DeathmatchGame.kMapMarkersEnabledTeam:
                for (const [ target, targetState ] of this.#state_) {
                    if (state.team === targetState.team)
                        visiblePlayers.push({ target, targetState });
                    else
                        invisiblePlayers.push({ target, targetState });
                }
                break;

            case DeathmatchGame.kMapMarkersDisabled:
                for (const [ target, targetState ] of this.#state_)
                    invisiblePlayers.push({ target, targetState });

                break;
        }

        // (2) Make sure that the |player| is invisible to those who can't see them.
        for (const { target, targetState } of invisiblePlayers) {
            if (!state.invisible.has(target)) {
                this.makeTargetInvisibleForPlayer(player, target, state.color);
                state.invisible.add(target);
            }

            if (!targetState.invisible.has(player)) {
                this.makeTargetInvisibleForPlayer(target, player, targetState.color);
                targetState.invisible.add(player);
            }
        }

        // (3) Make sure that the |player| is visible to those who are able to see them.
        for (const { target, targetState } of visiblePlayers) {
            if (state.invisible.has(target)) {
                this.makeTargetVisibleForPlayer(player, target, state.color);
                state.invisible.delete(target);
            }

            if (targetState.invisible.has(player)) {
                this.makeTargetVisibleForPlayer(target, player, targetState.color);
                targetState.invisible.delete(player);
            }
        }
    }

    // Makes the given |target| invisible for the given |player|.
    makeTargetInvisibleForPlayer(player, target, playerColor) {
        player.setColorForPlayer(target, playerColor.withAlpha(0));
        player.toggleVisibilityToPlayer(target, /* visible= */ false);
    }

    // Makes the given |target| visible again for the given |player|. The player's |color| can be
    // re-set as well, but this could be skipped when the |player| leaves the minigame.
    makeTargetVisibleForPlayer(player, target, playerColor = null) {
        if (playerColor !== null)
            player.setColorForPlayer(target, playerColor);

        player.toggleVisibilityToPlayer(target, /* visible= */ true);
    }

    // Resets the map marker settings for the |player| as they are leaving the game. We the list of
    // participants and reset visibility for any invisible players.
    resetMapMarkerSettingForPlayer(player, state) {
        for (const [ target, targetState ] of this.#state_) {
            if (state.invisible.has(target)) {
                this.makeTargetVisibleForPlayer(player, target);
                state.invisible.delete(target);
            }

            if (targetState.invisible.has(player)) {
                this.makeTargetVisibleForPlayer(target, player);
                targetState.invisible.delete(player);
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Section: Team color
    // ---------------------------------------------------------------------------------------------

    // Applies the team colour setting for the given |player|. This makes sure that all players who
    // are part of the same team, get either a red or a blue colour assigned to them.
    applyTeamColorSettingForPlayer(player, team) {
        const state = this.#state_.get(player);

        if (team === DeathmatchGame.kTeamAlpha)
            player.color = state.color = kTeamColorAlpha;
        else if (team === DeathmatchGame.kTeamBravo)
            player.color = state.color = kTeamColorBravo;
    }

    // Resets the |player|'s color back to what it was. We always re-set their color, as markers may
    // also amend the |player|'s color and we shouldn't re-set it twice.
    resetTeamColorSettingForPlayer(player, state) {
        if (state && this.isTeamBased())
            player.color = state.originalColor;
    }

    // ---------------------------------------------------------------------------------------------
    // Section: Team damage
    // ---------------------------------------------------------------------------------------------

    // Applies the team damage setting for the given |player|. This is achieved by putting them in
    // the same team as everyone else they're playing with, when damage should be void.
    applyTeamDamageSettingForPlayer(player) {
        const state = this.#state_.get(player);
        if (state && state.team !== null && !this.#teamDamage_)
            player.team = state.team;
    }

    // Resets the |player|'s team back to what it was before the game started, in case it was
    // modified per the game's settings - to enable voiding team damage.
    resetTeamDamageSettingForPlayer(player) {
        const state = this.#state_.get(player);
        if (state && state.team !== null && !this.#teamDamage_)
            player.team = state.originalTeam;
    }
}
