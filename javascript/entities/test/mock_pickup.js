// Copyright 2016 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Mocked version of the Pickup implementation. Follows the same API, but does not actually create
// pickups on the SA-MP server.
class MockPickup {
    constructor(manager, modelId, type, position, virtualWorld) {
        this.manager_ = manager;

        this.modelId_ = modelId;
        this.type_ = type;
        this.position_ = position;
        this.virtualWorld_ = virtualWorld;

        this.id_ = Math.round(Math.random() * 10000);
    }

    // Gets the id of the pickup this object is representing.
    get id() { return this.id_; }

    // Returns whether the pickup still exists on the server.
    isConnected() { return this.id_ !== null; }

    // Gets the model Id used to present this pickup.
    get modelId() { return this.modelId_; }

    // Gets the type of this pickup, which defines its behaviour.
    get type() { return this.type_; }

    // Gets the position of this pickup in the world.
    get position() { return this.position_; }

    // Gets the Virtual World in which this pickup will appear.
    get virtualWorld() { return this.virtualWorld_; }

    // Disposes of the pickup, and removes it from the server.
    dispose() {
        this.id_ = null;

        this.manager_.didDisposePickup(this);
        this.manager_ = null;
    }
}

exports = MockPickup;
