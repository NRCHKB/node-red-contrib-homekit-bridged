module.exports = function() {
    ("use strict");
    const debug = require("debug")("NRCHKB");

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
        handleUnpair: handleUnpair
    };
};
