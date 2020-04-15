class MediaControl {
    constructor() {
        this.config = {
            devices: { audioInputs: [], audioOutputs: [], videoInputs: [] },
            constraints: { audio: null, video: null },
            speakerOut: null,
            stream: null
        }
    }
    init() {
        return new Promise((resolve, reject) => {
            if (navigator.mediaDevices === undefined) 
                navigator.mediaDevices = {};

            if (navigator.mediaDevices.getUserMedia === undefined) {
                navigator.mediaDevices.getUserMedia = constraints => {
                    const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                    if (!getUserMedia) 
                        return reject('getUserMedia is not implemented in this browser');
                    return new Promise((resolve, reject) => getUserMedia.call(navigator, constraints, resolve, reject));
                }
            }

            if (!navigator.mediaDevices.enumerateDevices) 
                return reject('Navigator does not support enumatedDevices');
            else
                return resolve();
        });
    }
    constraintsUpdate(constraint = null, type = null, sp = null) { // Stream Player => <video>/<audio>
        console.log(constraint, type);
        if (constraint === null)
            return console.error('DeviceId null', constraint);

        if (type === 'audioinput')
            this.config.constraints.audio = constraint;
        else if (type === 'audiooutput') {
            this.config.speakerOut = constraint;
            sp !== null ? sp.setSinkId(this.config.speakerOut) : null;
        } else if (type === 'videoinput')
            this.config.constraints.video = constraint;
        else 
            console.error(type, 'not recognized');
    }
    getStream() {
        return this.config.stream;
    }
    setStream(stream) {
        return this.config.stream = stream;
    }
    stopStream() {
        if (this.config.stream !== null && this.config.stream !== undefined) {
            this.config.stream.getTracks().forEach(track => track.stop());
            this.config.stream = null;
        } else {
            console.log('Stream already stopped');
        }
    }
    showDevices(callback = null) { // Expecred params are callbacks functions
        this.retrieveDevices().then(devices => {
            devices.forEach(device => {
                if (device.kind === 'audioinput') {
                    this.config.devices.audioInputs.push(device);
                } else if (device.kind === 'audiooutput') {
                    this.config.devices.audioOutputs.push(device);
                } else if (device.kind === 'videoinput') {
                    this.config.devices.videoInputs.push(device);
                } else { return console.error(device.kind, 'not supported'); }
                typeof callback === 'function' ? callback(device) : null;
            });
            console.log('MediaDevices', this.config.devices);
        }).catch(console.error);
    }
    checkPermissions() {
        return new Promise((resolve, reject) => {
            const periphs = [
                { name: 'microphone', constraintName: 'audio', type: 'audioinput', constraintValue: true }, 
                { name: 'camera', constraintName: 'video', type: 'videoinput', constraintValue: { 'width': 1920, 'height': 1080 } }
            ];
            periphs.forEach((periph, index, array) => {
                let { name, constraintName, constraintValue, type } = periph;

                this.retrievePermissions(name).then(permissions => {
                    if (permissions.state === 'granted') {
                        this.constraintsUpdate(constraintValue, type);
                        if (index === array.length - 1) return resolve();
                    } else if (permissions.state === 'prompt') {
                        const constraints = { audio: constraintName === 'audio' ? true : false, video: constraintName === 'video' ? true : false };
                        this.requestDevices(constraints).then(stream => {
                            stream.getTracks().forEach(track => track.stop());
                            this.constraintsUpdate(constraintValue, type);
                            if (index === array.length - 1) return resolve();
                        }).catch(error => {
                            console.error(error);
                            this.constraintsUpdate(false, type);
                            if (index === array.length - 1) return resolve();
                        });
                    } else {
                        this.constraintsUpdate(false, type);
                    }
                }).catch(error => {
                    this.constraintsUpdate(false, type);
                    console.error(error);
                });
            });
        });
    }
    retrievePermissions(name) {
        return new Promise((resolve, reject) => navigator.permissions.query({ name }).then(permissions => resolve(permissions)).catch(error => reject(error)));
    }
    retrieveDevices() {
        return new Promise((resolve, reject) => navigator.mediaDevices.enumerateDevices().then(devices => resolve(devices)).catch(error => reject(error)));
    }
    requestDevices(constraints = null) {
        constraints === null ? constraints = this.config.constraints : constraints;
        return new Promise((resolve, reject) => navigator.mediaDevices.getUserMedia(constraints).then(stream => resolve(stream)).catch(error => reject(error)));
    }
}

const streamPlayer = document.querySelector('video.stream-player');
const btnStream = document.querySelector('button.btn-stream-control');

const selector = {
    audioInputs: document.querySelector('select.devices-audio-input'),
    audioOutputs: document.querySelector('select.devices-audio-output'),
    videoInputs: document.querySelector('select.devices-video-input'),
    append: (device, type) => {
        const option = document.createElement('option');
        option.textContent = device.label;
        option.value = device.deviceId;
        if (type === 'audioinput') {
            selector.audioInputs.append(option);
        } else if (type === 'audiooutput') {
            selector.audioOutputs.append(option);
        } else if (type === 'videoinput') {
            selector.videoInputs.append(option);
        }
    }
}

window.addEventListener('load', () => {
    const mediaControl = window._mediaControl = new MediaControl();
    mediaControl.init().then(() => {
        mediaControl.checkPermissions().then(() => mediaControl.showDevices(device => selector.append(device, device.kind))).catch(console.error);
        let isStreamStarted = false;
        btnStream.addEventListener('click', () => {
            console.log(isStreamStarted);
            if (!isStreamStarted) {
                isStreamStarted = true;
                btnStream.textContent = 'Stop';
                mediaControl.requestDevices().then(stream => streamPlayer.srcObject = mediaControl.setStream(stream)).catch(console.error);
            } else {
                isStreamStarted = false;
                btnStream.textContent = 'Start';
                mediaControl.stopStream();
            }
        });
    }).catch(console.error);

    selector.audioInputs.addEventListener('change', event => mediaControl.constraintsUpdate(event.target.value, 'audioinput'));
    selector.audioOutputs.addEventListener('change', event => mediaControl.constraintsUpdate(event.target.value, 'audiooutput', streamPlayer));
    selector.videoInputs.addEventListener('change', event => mediaControl.constraintsUpdate(event.target.value, 'videoinput'));
});