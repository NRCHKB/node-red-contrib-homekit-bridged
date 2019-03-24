module.exports = function(RED) {
    const debug = require("debug")("NRCHKB");
    const qrcodeGenerator = require("qrcode");
    const url = require("url");

    let qrcodeCache = {};
    let pincodeCache = {};

    const splitPincode = function(pincode) {
        const result = {};
        result.top = pincode.substr(0, 4);
        result.bottom = pincode.substr(4);

        return result;
    };

    const cleanPincode = function(pincode) {
        return pincode.replace(/[^\d]/, "").replace(/[^\d]/, "");
    };

    const result = function (res, status, error, qrcode, pincode) {
        const body = {};
        body.error = error;
        body.qrcode = qrcode;
        body.pincode = pincode;

        res.write(JSON.stringify(body));
        res.statusCode = status;
        res.end();
    };

    const variableUndefined = function (v) {
        return typeof v === "undefined" || v === null;
    };

    const start = function() {
        debug("QRCode Badge Generator started. Usage /qrcode?nodeId=<id>");

        //Ok - 200
        //Ok but check again - 201
        //Ok but no need to display qrcode - 300
        //Not found - 404
        //Error - 500
        RED.httpAdmin.get(
            "/qrcode",
            RED.auth.needsPermission("homekit.read"),
            function (req, res) {
                try {
                    const url_parts = url.parse(req.url, true);
                    const query = url_parts.query;

                    const nodeId = query.nodeId;

                    //nodeId is empty
                    if (variableUndefined(nodeId)) {
                        result(res, 404, true);
                        return;
                    }

                    const node = RED.nodes.getNode(nodeId);

                    if (variableUndefined(node)) {
                        result(res, 404, true);
                        return;
                    }

                    const bridgeNode = node.bridgeNode;


                    if (variableUndefined(bridgeNode)
                        || variableUndefined(bridgeNode.bridge)
                        || variableUndefined(bridgeNode.bridge._server)
                        || variableUndefined(bridgeNode.bridge._server.accessoryInfo)) {
                        result(res, 201, false);
                        return;
                    }

                    //Bridge already paired so no need to display qrcode
                    if (bridgeNode.bridge._server.accessoryInfo.paired()) {
                        result(res, 300, false);
                        return;
                    }

                    const cacheKey = bridgeNode.id + "_" + bridgeNode.pinCode;

                    //We have qrcode cached already
                    if (qrcodeCache.hasOwnProperty(cacheKey)) {
                        debug("Return cached badge for Bridge: " + bridgeNode.id);
                        result(res, 200, false, qrcodeCache[cacheKey], pincodeCache[cacheKey]);
                        return;
                    }

                    if (!bridgeNode.published) {
                        debug("Bridge not yet published: " + bridgeNode.id);
                        result(res, 201, false);
                        return;
                    }

                    const setupURI = bridgeNode.bridge.setupURI();

                    let opts = {
                        setupURI: setupURI,
                        qrcode: {
                            errorCorrectionLevel: "H",
                            margin: 0
                        }
                    };

                    qrcodeGenerator.toDataURL(opts.setupURI, opts.qrcode, function (err, url) {
                        if (err) {
                            console.error("There was an error while generating qrcode for Bridge " + bridgeNode.id, err);
                            result(res, 500, true);
                            return;
                        }

                        debug("Generated new badge for Bridge: " + bridgeNode.id);

                        qrcodeCache[cacheKey] = url;
                        pincodeCache[cacheKey] = splitPincode(cleanPincode(bridgeNode.pinCode));

                        result(res, 200, false, qrcodeCache[cacheKey], pincodeCache[cacheKey]);
                    });
                } catch (err) {
                    console.error("There was an error in QRCode Badge Generator", err);
                    result(res, 500, true);
                }
            }
        );
    };

    return {
        splitPincode: splitPincode,
        start: start
    };
};
