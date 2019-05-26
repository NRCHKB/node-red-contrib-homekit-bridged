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
			
			node.warn("After redeploy, please restart Node-RED to function properly!")
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

    return {
        delayedPublish: delayedPublish
    };
};
