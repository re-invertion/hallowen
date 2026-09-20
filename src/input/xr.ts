import {Scene} from '@babylonjs/core/scene';
import {WebXRDefaultExperience} from '@babylonjs/core/XR/webXRDefaultExperience';
import {WebXRState} from '@babylonjs/core/XR/webXRTypes';
import {Ray} from '@babylonjs/core/Culling/ray';
import {Vector3, Quaternion} from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/XR/motionController/webXROculusTouchMotionController';
import {moveHorizontal} from './locomotion';

export async function createXR(scene: Scene, onPause: (paused: boolean) => void, onSelect: (ray: Ray) => void, onExit: () => void) {
  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    disableDefaultUI: true, disableTeleportation: true, disablePointerSelection: true,
    disableNearInteraction: true, disableHandTracking: true,
    inputOptions: {doNotLoadControllerMeshes: true, disableOnlineControllerRepository: true},
  });
  let pressed = false, forward = new Vector3(0, 0, 1);
  const manager = xr.baseExperience.sessionManager;
  manager.onXRSessionInit.add(session => {
    const changed = () => {pressed = false; onPause(session.visibilityState !== 'visible');};
    session.addEventListener('visibilitychange', changed);
    session.addEventListener('end', () => session.removeEventListener('visibilitychange', changed), {once: true});
  });
  manager.onXRSessionEnded.add(() => {pressed = false; onPause(true); onExit();});
  const active = () => xr.baseExperience.state === WebXRState.IN_XR;
  const pointerRay = new Ray(Vector3.Zero(), Vector3.Forward());
  return {
    xr, active,
    async enter() {await xr.baseExperience.enterXRAsync('immersive-vr', 'local-floor', xr.renderTarget);},
    async exit() {if (active()) await xr.baseExperience.exitXRAsync();},
    reset() {
      const camera = xr.baseExperience.camera;
      camera.position.x = 0; camera.position.z = 4;
      const yaw = camera.rotationQuaternion.toEulerAngles().y;
      camera.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), -yaw).multiply(camera.rotationQuaternion);
      pressed = true;
    },
    ray(): Ray | null {
      const right = xr.input.controllers.find(c => c.inputSource.handedness === 'right');
      if (!right) return null;
      right.getWorldPointerRayToRef(pointerRay); pointerRay.length = 3; return pointerRay;
    },
    update(dt: number, speed: number, turnSpeed: number, doorOpen: boolean, canMove: boolean, canSelect: boolean) {
      if (!active()) return;
      const camera = xr.baseExperience.camera;
      const left = xr.input.controllers.find(c => c.inputSource.handedness === 'left');
      const right = xr.input.controllers.find(c => c.inputSource.handedness === 'right');
      if (canMove) {
        const f = camera.getForwardRay().direction;
        if (Math.hypot(f.x, f.z) > .01) forward = f.clone();
        const axes = left?.motionController?.getComponentOfType('thumbstick')?.axes ?? {x: 0, y: 0};
        camera.position.copyFrom(moveHorizontal(camera.position, forward, axes, speed, dt, doorOpen));
        const turn = right?.motionController?.getComponentOfType('thumbstick')?.axes.x ?? 0;
        if (Math.abs(turn) > .15) {
          // Babylon converts pose changes into an offset reference space around the current head position.
          camera.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), turn * turnSpeed * Math.PI / 180 * dt).multiply(camera.rotationQuaternion);
        }
      }
      const nextPressed = right?.motionController?.getComponentOfType('trigger')?.pressed ?? false;
      const ray = this.ray();
      if (nextPressed && !pressed && ray && canSelect) onSelect(ray);
      pressed = nextPressed;
    },
    dispose() {xr.dispose();},
  };
}
