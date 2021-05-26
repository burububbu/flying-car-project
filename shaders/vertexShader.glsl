attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec4 a_color;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec3 u_viewWorldPosition;

varying vec3 v_normal;
varying vec3 v_surfaceToView;
varying vec4 v_color;

void main() {
    vec4 worldPosition = u_world * a_position;
    gl_Position = u_projection * u_view * worldPosition;
    v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
    v_normal = mat3(u_world) * a_normal;
    v_color = a_color;
}