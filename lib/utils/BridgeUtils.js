module.exports = function(node) {
    ("use strict");
    const debug = require("debug")("NRCHKB");

    // Publish accessory after the service has been added
    // BUT ONLY after 5 seconds with no new service have passed
    // otherwise, our bridge would get published too early during startup and
    // services being added after that point would be seen as "new" in iOS,
    // removing all parameters set (Rooms, Groups, Scenes...)
    const delayedPublish = function (node, publishTimers) {
        if (!node.bridgeNode.published) {
            if (publishTimers[node.bridgeNode.id] !== undefined) {
                clearTimeout(publishTimers[node.bridgeNode.id]);
            }

            publishTimers[node.bridgeNode.id] = setTimeout(
                function () {
                    try {
                        node.bridgeNode.publish();
                        debug("Bridge [" + node.bridgeNode.id + "] published");
                    } catch(err) {
                        node.error("Bridge [" + node.bridgeNode.id + "] publish failed due to: " + err);

                        node.status({
                            fill: "red",
                            shape: "ring",
                            text: "Error while publishing Bridge"
                        });
                    }
                },
                5000
            );
        }

        return publishTimers;
    };
    
    const handleUnpair = function(username, callback) {
        debug("[%s] Unpairing with client %s", this.displayName, username);

        // Unpair
        this._accessoryInfo.removePairedClient(username);
        this._accessoryInfo.save();

        // update our advertisement so it can pick up on the paired status of AccessoryInfo
        if (this._advertiser){
            this._advertiser.updateAdvertisement();
        }

        callback();
    };

    return {
        handleUnpair: handleUnpair,
        delayedPublish: delayedPublish
    };
};
