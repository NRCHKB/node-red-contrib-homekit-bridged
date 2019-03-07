module.exports = function(node) {
    ("use strict");

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
                node.bridgeNode.publish,
                5000
            );
        }

        return publishTimers;
    };

    return {
        delayedPublish: delayedPublish
    };
};
