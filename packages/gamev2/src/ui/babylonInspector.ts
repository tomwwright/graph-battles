import type { Scene } from '@babylonjs/core/scene';
import type { InspectorToken } from '@babylonjs/inspector';

export function attachInspectorToggle(scene: Scene): void {
  let token: InspectorToken | undefined;
  window.addEventListener('keydown', async (ev) => {
    // Shift+Ctrl+Alt+I
    if (!(ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73)) return;
    if (token) {
      console.info('Hiding BabylonJS inspector...');
      token.dispose();
      token = undefined;
    } else {
      console.info('Showing BabylonJS inspector...');
      const { ShowInspector } = await import('@babylonjs/inspector');
      token = ShowInspector(scene);
    }
  });
}
