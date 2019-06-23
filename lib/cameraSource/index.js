"use strict";

const HapNodeJS = require("hap-nodejs");
const uuid = HapNodeJS.uuid;
const Service = HapNodeJS.Service;
const Characteristic = HapNodeJS.Characteristic;
const StreamController = HapNodeJS.StreamController;

const crypto = require("crypto");
const fs = require("fs");
const ip = require("ip");
const spawn = require("child_process").spawn;

const debug = require("debug")("NRCHKB_Camera");

module.exports = {
    Camera: Camera
};

function Camera(cameraControlService, config) {
    this.name = config.name;
    this.vcodec = config.cameraConfigVideoCodec;
    this.videoProcessor = config.cameraConfigVideoProcessor;
    this.audio = config.cameraConfigAudio;
    this.acodec = config.cameraConfigAudioCodec;
    this.packetsize = config.cameraConfigPacketSize;
    this.fps = config.cameraConfigMaxFPS;
    this.maxBitrate = config.cameraConfigMaxBitrate;
    this.debug = config.cameraConfigDebug;
    this.additionalCommandline = config.cameraConfigAdditionalCommandLine;
    this.vflip = config.cameraConfigVerticalFlip;
    this.hflip = config.cameraConfigHorizontalFlip;
    this.mapvideo = config.cameraConfigMapVideo;
    this.mapaudio = config.cameraConfigMapAudio;
    this.videoFilter = config.cameraConfigVideoFilter;

    if (!config.cameraConfigSource) {
        throw new Error("Missing source for camera.");
    }

    this.ffmpegSource = config.cameraConfigSource;
    this.ffmpegImageSource = config.cameraConfigStillImageSource;

    this.services = [];
    this.streamControllers = [];

    this.pendingSessions = {};
    this.ongoingSessions = {};

    this.uploader = false; //TODO: FFU to upload snapshots

    const numberOfStreams = config.cameraConfigMaxStreams;
    const videoResolutions = [];

    this.maxWidth = config.cameraConfigMaxWidth;
    this.maxHeight = config.cameraConfigMaxHeight;
    const maxFPS = (this.fps > 30) ? 30 : this.fps;

    if (this.maxWidth >= 320) {
        if (this.maxHeight >= 240) {
            videoResolutions.push([320, 240, maxFPS]);
            if (maxFPS > 15) {
                videoResolutions.push([320, 240, 15]);
            }
        }

        if (this.maxHeight >= 180) {
            videoResolutions.push([320, 180, maxFPS]);
            if (maxFPS > 15) {
                videoResolutions.push([320, 180, 15]);
            }
        }
    }

    if (this.maxWidth >= 480) {
        if (this.maxHeight >= 360) {
            videoResolutions.push([480, 360, maxFPS]);
        }

        if (this.maxHeight >= 270) {
            videoResolutions.push([480, 270, maxFPS]);
        }
    }

    if (this.maxWidth >= 640) {
        if (this.maxHeight >= 480) {
            videoResolutions.push([640, 480, maxFPS]);
        }

        if (this.maxHeight >= 360) {
            videoResolutions.push([640, 360, maxFPS]);
        }
    }

    if (this.maxWidth >= 1280) {
        if (this.maxHeight >= 960) {
            videoResolutions.push([1280, 960, maxFPS]);
        }

        if (this.maxHeight >= 720) {
            videoResolutions.push([1280, 720, maxFPS]);
        }
    }

    if (this.maxWidth >= 1920) {
        if (this.maxHeight >= 1080) {
            videoResolutions.push([1920, 1080, maxFPS]);
        }
    }

    let options = {
        proxy: false, // Requires RTP/RTCP MUX Proxy TODO: Should I make it configurable?
        srtp: true, // Supports SRTP AES_CM_128_HMAC_SHA1_80 encryption TODO: Should I make it configurable?
        video: {
            resolutions: videoResolutions,
            codec: {
                profiles: [0, 1, 2], // Enum, please refer StreamController.VideoCodecParamProfileIDTypes TODO: Should I make it configurable?
                levels: [0, 1, 2] // Enum, please refer StreamController.VideoCodecParamLevelTypes TODO: Should I make it configurable?
            }
        },
        audio: {
            codecs: [
                {
                    type: "OPUS", // Audio Codec TODO: Should I make it configurable?
                    samplerate: 24 // 8, 16, 24 KHz TODO: Should I make it configurable?
                },
                {
                    type: "AAC-eld", // TODO: Should I make it configurable?
                    samplerate: 16 // TODO: Should I make it configurable?
                }
            ]
        }
    };

    this._createStreamControllers(cameraControlService, numberOfStreams, options);
}

Camera.prototype.handleCloseConnection = function (connectionID) {
    this.streamControllers.forEach(function (controller) {
        controller.handleCloseConnection(connectionID);
    });
};

Camera.prototype.handleSnapshotRequest = function (request, callback) {
    let resolution = request.width + "x" + request.height;

    let imageSource = this.ffmpegImageSource;

    if (imageSource === undefined || !imageSource.trim()) {
        imageSource = this.ffmpegSource;
    }

    let ffmpeg = spawn(this.videoProcessor, (imageSource + " -t 1 -s " + resolution + " -f image2 -").split(" "), {env: process.env});
    let imageBuffer = Buffer.alloc(0);

    debug("Snapshot from " + this.name + " at " + resolution);
    debug("ffmpeg " + imageSource + " -t 1 -s " + resolution + " -f image2 -");

    ffmpeg.stdout.on("data", function (data) {
        imageBuffer = Buffer.concat([imageBuffer, data]);
    });

    let self = this;
    ffmpeg.on("error", function (error) {
        console.error("An error occurs while making snapshot request");
        console.error(error);
    });

    ffmpeg.on("close", function (code) {
        if (this.uploader) {
            //TODO: Upload snapshot
        }
        callback(undefined, imageBuffer);
    }.bind(this));
};

Camera.prototype.prepareStream = function (request, callback) {
    const sessionInfo = {};

    let sessionID = request["sessionID"];
    sessionInfo["address"] = request["targetAddress"];

    const response = {};

    let videoInfo = request["video"];
    if (videoInfo) {
        let targetPort = videoInfo["port"];
        let srtp_key = videoInfo["srtp_key"];
        let srtp_salt = videoInfo["srtp_salt"];

        // SSRC is a 32 bit integer that is unique per stream
        let ssrcSource = crypto.randomBytes(4);
        ssrcSource[0] = 0;
        let ssrc = ssrcSource.readInt32BE(0, true);

        response["video"] = {
            port: targetPort,
            ssrc: ssrc,
            srtp_key: srtp_key,
            srtp_salt: srtp_salt
        };

        sessionInfo["video_port"] = targetPort;
        sessionInfo["video_srtp"] = Buffer.concat([srtp_key, srtp_salt]);
        sessionInfo["video_ssrc"] = ssrc;
    }

    let audioInfo = request["audio"];
    if (audioInfo) {
        let targetPort = audioInfo["port"];
        let srtp_key = audioInfo["srtp_key"];
        let srtp_salt = audioInfo["srtp_salt"];

        // SSRC is a 32 bit integer that is unique per stream
        let ssrcSource = crypto.randomBytes(4);
        ssrcSource[0] = 0;
        let ssrc = ssrcSource.readInt32BE(0, true);

        response["audio"] = {
            port: targetPort,
            ssrc: ssrc,
            srtp_key: srtp_key,
            srtp_salt: srtp_salt
        };

        sessionInfo["audio_port"] = targetPort;
        sessionInfo["audio_srtp"] = Buffer.concat([srtp_key, srtp_salt]);
        sessionInfo["audio_ssrc"] = ssrc;
    }

    let currentAddress = ip.address();
    const addressResp = {
        address: currentAddress
    };

    if (ip.isV4Format(currentAddress)) {
        addressResp["type"] = "v4";
    } else {
        addressResp["type"] = "v6";
    }

    response["address"] = addressResp;
    this.pendingSessions[uuid.unparse(sessionID)] = sessionInfo;

    callback(response);
};

Camera.prototype.handleStreamRequest = function (request) {
    const sessionID = request["sessionID"];
    const requestType = request["type"];
    if (sessionID) {
        let sessionIdentifier = uuid.unparse(sessionID);

        debug("Request type: " + requestType);

        if (requestType === "start") {
            const sessionInfo = this.pendingSessions[sessionIdentifier];
            if (sessionInfo) {
                let width = 1280;
                let height = 720;
                let fps = this.fps || 30;
                let vbitrate = this.maxBitrate;
                let abitrate = 32;
                let asamplerate = 16;
                const vcodec = this.vcodec;
                const acodec = this.acodec;
                const packetsize = this.packetsize || 1316;
                const additionalCommandline = this.additionalCommandline;
                const mapvideo = this.mapvideo;
                const mapaudio = this.mapaudio;

                let videoInfo = request["video"];
                if (videoInfo) {
                    width = videoInfo["width"];
                    height = videoInfo["height"];

                    let expectedFPS = videoInfo["fps"];
                    if (expectedFPS < fps) {
                        fps = expectedFPS;
                    }
                    if (videoInfo["max_bit_rate"] < vbitrate) {
                        vbitrate = videoInfo["max_bit_rate"];
                    }
                }

                let audioInfo = request["audio"];
                if (audioInfo) {
                    abitrate = audioInfo["max_bit_rate"];
                    asamplerate = audioInfo["sample_rate"];
                }

                let targetAddress = sessionInfo["address"];
                let targetVideoPort = sessionInfo["video_port"];
                let videoKey = sessionInfo["video_srtp"];
                let videoSsrc = sessionInfo["video_ssrc"];
                let targetAudioPort = sessionInfo["audio_port"];
                let audioKey = sessionInfo["audio_srtp"];
                let audioSsrc = sessionInfo["audio_ssrc"];
                let vf = [];

                let videoFilter = ((this.videoFilter === "") ? ("scale=" + width + ":" + height + "") : (this.videoFilter)); // empty string indicates default
                // In the case of null, skip entirely
                if (videoFilter !== null) {
                    vf.push(videoFilter);

                    if (this.hflip)
                        vf.push("hflip");

                    if (this.vflip)
                        vf.push("vflip");
                }

                let fcmd = this.ffmpegSource;

                let ffmpegVideoArgs = " -map " + mapvideo +
                    " -vcodec " + vcodec +
                    " -pix_fmt yuv420p" +
                    " -r " + fps +
                    " -f rawvideo" +
                    " " + additionalCommandline +
                    ((vf.length > 0) ? (" -vf " + vf.join(",")) : ("")) +
                    " -b:v " + vbitrate + "k" +
                    " -bufsize " + vbitrate + "k" +
                    " -maxrate " + vbitrate + "k" +
                    " -payload_type 99";

                let ffmpegVideoStream = " -ssrc " + videoSsrc +
                    " -f rtp" +
                    " -srtp_out_suite AES_CM_128_HMAC_SHA1_80" +
                    " -srtp_out_params " + videoKey.toString("base64") +
                    " srtp://" + targetAddress + ":" + targetVideoPort +
                    "?rtcpport=" + targetVideoPort +
                    "&localrtcpport=" + targetVideoPort +
                    "&pkt_size=" + packetsize;

                // build required video arguments
                fcmd += ffmpegVideoArgs;
                fcmd += ffmpegVideoStream;

                // build optional audio arguments
                if (this.audio) {
                    let ffmpegAudioArgs = " -map " + mapaudio +
                        " -acodec " + acodec +
                        " -profile:a aac_eld" +
                        " -flags +global_header" +
                        " -f null" +
                        " -ar " + asamplerate + "k" +
                        " -b:a " + abitrate + "k" +
                        " -bufsize " + abitrate + "k" +
                        " -ac 1" +
                        " -payload_type 110";

                    let ffmpegAudioStream = " -ssrc " + audioSsrc +
                        " -f rtp" +
                        " -srtp_out_suite AES_CM_128_HMAC_SHA1_80" +
                        " -srtp_out_params " + audioKey.toString("base64") +
                        " srtp://" + targetAddress + ":" + targetAudioPort +
                        "?rtcpport=" + targetAudioPort +
                        "&localrtcpport=" + targetAudioPort +
                        "&pkt_size=" + packetsize;

                    fcmd += ffmpegAudioArgs;
                    fcmd += ffmpegAudioStream;
                }

                if (this.debug) {
                    fcmd += " -loglevel debug";
                }

                let ffmpeg = spawn(this.videoProcessor, fcmd.split(" "), {env: process.env});
                debug("Start streaming video from " + this.name + " with " + width + "x" + height + "@" + vbitrate + "kBit");
                debug("ffmpeg " + fcmd);

                ffmpeg.stderr.on("data", function (data) {
                    debug("ffmpeg data: " + data.toString());
                }.bind(this));

                let self = this;

                ffmpeg.on("error", function (error) {
                    console.error("An error occurred while making stream request");
                    console.error(error);
                });

                ffmpeg.on("close", (code) => {
                    if (code == null || code === 0 || code === 255) {
                        debug("Stopped streaming");
                    } else {
                        console.error("ERROR: FFmpeg exited with code " + code);

                        for (let i = 0; i < self.streamControllers.length; i++) {
                            const controller = self.streamControllers[i];
                            if (controller.sessionIdentifier === sessionID) {
                                controller.forceStop();
                            }
                        }
                    }
                });
                this.ongoingSessions[sessionIdentifier] = ffmpeg;
            }

            delete this.pendingSessions[sessionIdentifier];
        } else if (requestType === "stop") {
            const ffmpegProcess = this.ongoingSessions[sessionIdentifier];

            if (ffmpegProcess) {
                ffmpegProcess.kill("SIGTERM");
            }

            delete this.ongoingSessions[sessionIdentifier];
        } else if (requestType === "reconfigure") {
            //TODO: What to do here?
        }
    }
};

Camera.prototype._createStreamControllers = function (cameraControlService, maxStreams, options) {
    let self = this;

    debug("Configuring services for Camera...");

    self.services.push(cameraControlService);
    debug("...added CameraControl Service");

    if (self.audio) {
        debug("...audio available");
    } else {
        debug("...audio not available");
    }

    debug("Creating Camera Stream Controllers: " + maxStreams + " - Started");
    debug("Camera options: " + JSON.stringify(options));

    for (let i = 0; i < maxStreams; i++) {
        const streamController = new StreamController(i, options, self);

        self.services.push(streamController.service);
        self.streamControllers.push(streamController);
    }

    debug("Creating Camera Stream Controllers - Finished");
};