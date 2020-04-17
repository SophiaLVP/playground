// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Parser to split up the IRC MODE command in a sequence of individual changes. The flexibility
// offered by the command's syntax makes it undesirable to do this in multiple places.
export class ModeParser {
    // Types of modes that will be recognised by the mode parser.
    static kModeWithParameter = 0;
    static kModeWithParameterWhenSet = 1;
    static kModeWithoutParameter = 2;

    modes_ = null;

    // Gets the modes that are known to the mode parser.
    get modes() { return this.modes_; }

    constructor() {
        this.modes_ = new Map();
    }

    // Sets the channel prefixes for the current network when given by the RPL_ISUPPORT message,
    // which tells us about the user statuses people are able to have in a channel.
    setChannelPrefixes(prefixes) {
        const divider = prefixes.indexOf(')');
        if (divider === -1 || prefixes.length != 2 * divider)
            throw new Error('Invalid PREFIX syntax found: ' + prefixes);

        this.setModesWithType(prefixes.substring(1, divider), ModeParser.kModeWithParameter);
    }

    // Sets the channel modes for the current network. This comes in four groups:
    //
    //   (a) Modes that always have a user as a parameter,
    //   (b) Modes that always have a parameter,
    //   (c) Modes that have a parameter when being set,
    //   (d) Modes that never have a parameter.
    //
    // We treat (a) and (b) as the same in our implementation, as no validation will be done. The
    // modes will be stored in the local |modes_| member.
    setChannelModes(modes) {
        const groups = modes.split(',');
        if (groups.length != 4)
            throw new Error('Invalid CHANMODES parameter received: ' + modes);
        
        this.setModesWithType(groups[0], ModeParser.kModeWithParameter);
        this.setModesWithType(groups[1], ModeParser.kModeWithParameter);
        this.setModesWithType(groups[2], ModeParser.kModeWithParameterWhenSet);
        this.setModesWithType(groups[3], ModeParser.kModeWithoutParameter);
    }

    // Sets the |modes| to the given |type|. Only to be used for internal calls.
    setModesWithType(modes, type) {
        for (const mode of [...modes]) {
            if (this.modes_.has(mode))
                throw new Error(`The mode "${mode}" has already been registered.`);
            
            this.modes_.set(mode, type);
        }
    }
}
