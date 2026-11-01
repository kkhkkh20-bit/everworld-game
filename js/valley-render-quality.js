// Presentation only; choosing quality never changes simulation time or resources.
export function createRenderQuality(renderer,mobile){
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const software=debug&&/swiftshader|llvmpipe|software/i.test(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
  let preference='auto',revision=0;
  function settings(){const smooth=preference==='smooth'||preference==='auto'&&(software||mobile);return {preference,smooth,software:!!software,ratio:Math.min(devicePixelRatio||1,smooth?.85:1.4),shadows:!smooth,revision};}
  function set(value){if(!['auto','smooth','high'].includes(value))return;preference=value;revision++;renderer.setPixelRatio(settings().ratio);}
  set('auto');return {settings,set};
}
