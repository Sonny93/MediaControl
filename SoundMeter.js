class SoundMeter {
    constructor(context) {
        this.context = context;
        this.instant = 0.0;
        this.slow = 0.0;
        this.script = context.createScriptProcessor(2048, 1, 1);
        this.script.onaudioprocess = (event) => {
            let input = event.inputBuffer.getChannelData(0), sum = 0.0;
            input.forEach(e => { sum += e * e; });
            this.instant = Math.sqrt(sum / input.length);
            this.slow = 0.95 * this.slow + 0.05 * this.instant;
        }
        this.connectToSource = function(stream, callback) {
            console.log('SoundMeter connecting ...');
            try {
                console.log('SoundMeter connected');
                this.mic = this.context.createMediaStreamSource(stream);
                this.mic.connect(this.script);
                this.script.connect(this.context.destination);
                if(typeof callback !== 'undefined') callback(null);
            } catch (e) {
                console.log('SoundMeter connection failed', e);
                if(typeof callback !== 'undefined') callback(e);
            }
        }
        this.stop = () => { try { this.script.disconnect(); this.mic.disconnect(); } catch(e) { console.log(e); } }
    }
}

window.onload = async () => {
    window.soundMeter = new SoundMeter(new AudioContext());
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        window.soundMeter.connectToSource(stream, (error) {
            if(error) {
                return console.error(error);
            }
            setInterval(() => {
                console.log(window.soundMeter.instant.toFixed(2));
                if(window.soundMeter.instant.toFixed(2) > 0.6) {
                    // Exemple saturation
                } else if(window.soundMeter.instant.toFixed(2) >= 0.01 && window.soundMeter.instant.toFixed(2) < 0.6) {
                    // Exemple speaking
                } else {
                    // No sound
                }
            }, 5);
        });
    } catch (e) {
        console.error(e);
    }
}

setTimeout(() => soundMeter.script.disconnect(), 10000); // Disconnect SoundMeter after 10 seconds
