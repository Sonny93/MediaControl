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
    constraintsUpdate(deviceId = null, type = null, _sp = null) {
        console.log(deviceId, type);
        if (deviceId === null)
            return console.error('DeviceId null', deviceId);

        if (type === 'audioinput') {
            this.config.constraints.audio = {
                deviceId
            }
        } else if (type === 'audiooutput') {
            this.config.speakerOut = deviceId;
            _sp !== null ? _sp.setSinkId(this.config.speakerOut) : null;
        } else if (type === 'videoinput') {
            this.config.constraints.video = {
                deviceId
            }
        } else { console.error(type, 'not recognized'); }
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
            const periphs = [{ name: 'microphone', consName: 'audio', isGranted: null }, { name: 'camera', consName: 'video', isGranted: null }];
            periphs.forEach((periph, index, array) => {
                let { name, consName } = periph;
                this.retrievePermissions(name).then(permissions => {
                    if (permissions.state === 'granted') {
                        this.config.constraints[consName] = periph.isGranted = true;
                        if (index === array.length - 1) return resolve(periphs);
                    } else if (permissions.state === 'prompt') {
                        const constraints = { audio: consName === 'audio' ? true : false, video: consName === 'video' ? true : false };
                        this.requestDevices(constraints).then(stream => {
                            stream.getTracks().forEach(track => track.stop());
                            this.config.constraints[consName] = periph.isGranted = true;
                            if (index === array.length - 1) return resolve(periphs);
                        }).catch(error => {
                            console.error(error);
                            this.config.constraints[consName] = periph.isGranted = false;
                            if (index === array.length - 1) return resolve(periphs);
                        });
                    } else {
                        this.config.constraints[consName] = periph.isGranted = false;
                    }
                }).catch(error => {
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
    requestDevices(constraints) {
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
selector.audioInputs.addEventListener('change', event => config.constraintsUpdate(event.target.value, 'audioinput'));
selector.audioOutputs.addEventListener('change', event => config.constraintsUpdate(event.target.value, 'audiooutput', streamPlayer));
selector.videoInputs.addEventListener('change', event => config.constraintsUpdate(event.target.value, 'videoinput'));

window.addEventListener('load', () => {
    const mediaControl = window._mediaControl = new MediaControl();
    mediaControl.init().then(() => {
        mediaControl.checkPermissions().then(() => mediaControl.showDevices(device => selector.append(device, device.kind))).catch(console.error);
        btnStream.addEventListener('click', () => {
            let isStreamStarted = mediaControl.getStream() !== null ? true : false;
            console.log(isStreamStarted);
            if (!isStreamStarted) {
                isStreamStarted = true;
                btnStream.textContent = 'Stop';
                mediaControl.requestDevices(mediaControl.config.constraints).then(stream => streamPlayer.srcObject = mediaControl.setStream(stream)).catch(console.error);
            } else {
                isStreamStarted = false;
                btnStream.textContent = 'Start';
                if (mediaControl.config.stream !== null) mediaControl.stopStream();
            }
        });
    }).catch(console.error);
});