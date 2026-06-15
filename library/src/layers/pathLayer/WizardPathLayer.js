// my-point-cloud-layer.js
// Example to add per-point size to point cloud layer
import { PathLayer } from 'deck.gl';
import vertexShader from './vertex';

export default class WizardPathLayer extends PathLayer {
    initializeState() {
        super.initializeState();
    }

    getShaders() {
        return { ...super.getShaders(), vs: vertexShader };
    }
}

WizardPathLayer.layerName = 'WizardPathLayer';
