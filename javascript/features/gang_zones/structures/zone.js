// Copyright 2020 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.
// @ts-check

// The alpha channel value for each of the gang zones drawn on the map.
const kGangZoneAlphaChannel = 0xA0;

// Represents a gang zone live on the server. These must only be created by the ZoneCalculator. The
// data accessors are the key part of this class, as most data will be stored elsewhere.
export class Zone {
    areaInfo_ = null;
    color_ = null;

    zoneGang_ = null;

    // Gets the area, as a Rect instance, which represents the zone.
    get area() { return this.areaInfo_.area; }

    // Gets the colour in which this gang zone should be drawn on the map.
    get color() { return this.zoneGang_.color.withAlpha(kGangZoneAlphaChannel); }

    // Gets the ID of the gang who owns this gang zone.
    get gangId() { return this.zoneGang_.id; }

    // Gets the goal of the gang who owns this gang zone.
    get gangGoal() { return this.zoneGang_.goal; }

    // Gets the name of the gang who owns this gang zone.
    get gangName() { return this.zoneGang_.name; }

    constructor(zoneGang, areaInfo) {
        this.areaInfo_ = areaInfo;
        this.color_ = zoneGang.color;

        this.zoneGang_ = zoneGang;
    }

    // Updates the stored area info with the new |info|, which supersedes the current situation.
    // Will return a set of flags that detail what exactly has been updated about the gang zone, as
    // that will influence how other systems deal with the change.
    update(info) {
        const flags = {
            // Indicates that the area of the gang zone has been updated.
            areaChanged: this.areaInfo_.area.minX !== info.area.minX ||
                         this.areaInfo_.area.minY !== info.area.minY ||
                         this.areaInfo_.area.maxX !== info.area.maxX ||
                         this.areaInfo_.area.maxY !== info.area.maxY,

            // Indicates that the color of the gang zone has been updated.
            colorChanged: this.zoneGang_.color != this.color_,
        };

        this.areaInfo_ = info;
        this.color_ = this.zoneGang_.color;

        return flags;
    }
}
