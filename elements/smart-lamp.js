document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('elements/smart-lamp.html')
    const data = await response.text();

    // TODO: Check if lamp is initialized in methods
    class SmartLamp extends HTMLElement {
        constructor() {
            super();
        }

        connectedCallback() {
            if (this._initialized) return;
            this._initialized = true;

            this.innerHTML = data;

            this._element = {
                card: this.querySelector(".smart-lamp-card"),
                modal: this.querySelector(".smart-lamp-modal"),
                modalIcon: this.querySelector(".smart-lamp-modal-icon"),
                picker: this.querySelector(".smart-lamp-modal-color"),
                state: this.querySelector(".smart-lamp-state"),
                color: this.querySelector(".smart-lamp-color"),
                icon: this.querySelector(".smart-lamp-icon"),
                brightnessBarWrapper: this.querySelector(".smart-lamp-brightness"),
                brightnessBarProgress: this.querySelector(".smart-lamp-brightness .progress-bar"),
            }

            this._elements = {
                name: this.querySelectorAll(".smart-lamp-name"),
            }

            const modalId = `smart-lamp-modal-${getRandomInt(1000, 9999)}`;

            this._element.modal.id = modalId;
            this._element.card.setAttribute('data-bs-target', `#${modalId}`);

            this._element.state.innerHTML = "Initialisieren";

            this._picker = Pickr.create({
                el: this._element.picker,
                theme: 'classic',
                showAlways: true,
                inline: true,
                lockOpacity: true,

                swatches: [
                    'rgb(244, 67, 54)',
                    'rgb(233, 30, 99)',
                    'rgb(156, 39, 176)',
                    'rgb(103, 58, 183)',
                    'rgb(63, 81, 181)',
                    'rgb(33, 150, 243)',
                    'rgb(3, 169, 244)',
                    'rgb(0, 188, 212)',
                    'rgb(0, 150, 136)',
                    'rgb(76, 175, 80)',
                    'rgb(139, 195, 74)',
                    'rgb(205, 220, 57)',
                    'rgb(255, 193, 7)'
                ],

                components: {
                    preview: true,
                    hue: true,
                    opacity: true,
                    interaction: {
                        hex: true,
                        rgba: true,
                        hsla: true,
                        hsva: true,
                        cmyk: true,
                        input: true,
                    }
                }
            });

            this._picker.on('change', color => {
                this.currentColor = color.toHEXA().toString();
                this.setPreviewColor(this.currentColor);

                const event = new CustomEvent("colorchange", {
                    bubbles: true,
                    detail: { color: this.currentColor }
                });

                this.dispatchEvent(event);
            });
            
            this._picker.on('init', () => {
                if (this.currentColor) this.setColor(this.currentColor);
            });

            this.setBrightnessBar(0)

            this.dispatchEvent(new Event("ready"));
        }

        setName(name) {
            this._elements.name.forEach(el => el.innerHTML = name);
        }

        /*
        setState(state) {
            switch(state) {
                case 'on':
                    this._element.state.innerHTML = "Ein";
                    break;
                case 'off':
                    this._element.state.innerHTML = "Aus";
                    this.setBrightnessBar(0);
                    break;
                case 'error':
                    this._element.state.innerHTML = "Fehler";
                    break;
                default:
                    this._element.state.innerHTML = "Initialisieren";
            }
        }
        */

        setColor(hexColor) {
            this.currentColor = hexColor;

            if (this._picker._initializingActive) this.setPreviewColor(hexColor);
            else this._picker.setColor(hexColor);
        }

        setPreviewColor(hexColor) {
            let color = hexToColor(hexColor);
            if (color == 'white' || color == 'gray') color = 'muted-lt';

            const colorClass = 'bg-' + color;

            const prevColorClasses = [...this._element.color.classList].filter(c => c.startsWith('bg-'))

            const rgbColor = hexToRgb(hexColor);
            const hsvColor = rgbToHsv(rgbColor);

            const colorBrightness = hsvColor[2] * 100;
            const colorBrightnessOff = 20;

            this.setBrightnessBar(colorBrightness);

            // Toggle lamp UI on/off
            if (colorBrightness < colorBrightnessOff) {
                this._element.color.classList.remove(...prevColorClasses, 'text-white');
                this._element.color.classList.add('bg-white');

                this._element.icon.classList.remove('ti-bulb')
                this._element.icon.classList.add('ti-bulb-off')
                this._element.modalIcon.classList.remove('ti-bulb')
                this._element.modalIcon.classList.add('ti-bulb-off')

                this._element.state.innerHTML = "Aus";

                this.setBrightnessBar(0);
                return;
            } else {
                this._element.color.classList.remove('bg-white');
                this._element.color.classList.add('text-white');

                this._element.icon.classList.remove('ti-bulb-off')
                this._element.icon.classList.add('ti-bulb')
                this._element.modalIcon.classList.remove('ti-bulb-off')
                this._element.modalIcon.classList.add('ti-bulb')

                this._element.state.innerHTML = "Ein";
            }

            if (prevColorClasses.includes(colorClass)) return;

            this._element.color.classList.remove(...prevColorClasses)
            this._element.color.classList.add(colorClass);
        }

        setBrightnessBar(brightness) {
            brightness = Math.round(brightness)
            const description = `${brightness}% Helligkeit`;

            this._element.brightnessBarWrapper.title = description;

            this._element.brightnessBarProgress.style.width = `${brightness}%`;
            this._element.brightnessBarProgress.setAttribute('aria-valuenow', brightness);
            this._element.brightnessBarProgress.setAttribute('aria-label', description);

            new bootstrap.Tooltip(this._element.brightnessBarWrapper);
        }
    }

    customElements.define("smart-lamp", SmartLamp);
});

const colorNames = ['blue', 'azure', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'muted']

const variables = getComputedStyle(document.documentElement);
const getColorFromVariable = color => variables.getPropertyValue(`--tblr-${color}-rgb`).split(',').map(c => parseInt(c));
const getLightColorFromVariable = color => getColorFromVariable(color).map(c => c + (255 - c) * 0.1);

const colorsClasses = colorNames.reduce((prev, color) => ({ ...prev, [color]: getColorFromVariable(color), [color + '-lt']: getLightColorFromVariable(color) }), {})
const colors = { ...colorsClasses, white: [255, 255, 255], gray: [128, 128, 128], /* black: [0, 0, 0] */ }

function hexToColor(hex) {
    const rgb = hexToRgb(hex);
    const color = getClosestColor(rgb);

    return color;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

function rgbToHsv(color) {
    [r, g, b] = color.map(c => c /= 255);

    let max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    let h, s, v = max;

    let d = max - min;
    s = max == 0 ? 0 : d / max;

    if (max == min) h = 0; // achromatic
    else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [h, s, v];
}


function getColorDistance(color1, color2) {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;
    return (r1 - r2) * (r1 - r2) + (g1 - g2) * (g1 - g2) + (b1 - b2) * (b1 - b2);
};

function getClosestColor(givenColor) {
    let closestDistance = null;
    let closestColor = [];

    for (let color in colors) {
        const distance = getColorDistance(colors[color], givenColor);
        if (closestDistance === null || distance < closestDistance) {
            closestDistance = distance;
            closestColor = [color];
        } else if (closestDistance === distance) {
            closestColor.push(color);
        }
    }

    return closestColor[0];
}