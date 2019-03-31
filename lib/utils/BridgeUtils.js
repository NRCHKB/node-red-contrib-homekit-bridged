module.exports = function(RED, node) {
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
                        debug(RED._("homekit.bridge.published"), node.bridgeNode.id);
                    } catch(err) {
                        node.error(RED._("homekit.bridge.publish_failed"), node.bridgeNode.id, err.message);

                        node.status({
                            fill: "red",
                            shape: "ring",
                            text: "homekit.bridge.publish_error"
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
