// PHONG MODEL
/*

this is what we have to insert into the fragcolor

add EMISSIVE COMPONENT -> k_e + Ile( light intensity ) + ...

I = k_a * I_a +
    K_d * I_d * cos(theta) +
    k_s * I_s *(cos_alpha)^n

AMBIENT COMPONENT -> k_a * I_a 
  k_a : riflessione luce ambiente materiale
  I_a : colore luce ambientale

DIFFUSE REFLECTION COMPONENT -> K_d * I_d * cos(theta)
It reflect the lambert's model for the diffuse light
  k_d: determine the color based on material type 
  I_d: diffuse light color rgb
  cos(theta) = L * N  = angle between surface normal N and light direction L

SPECULAR REFLECTION COMPONENT -> k_s * I_s *(cos_alpha)^n
k_s: material characteristics
I_s: light characteristics
cos(alpha) = R * V = angle between reflected direction R and surface direction of observer V
*/


precision highp float;
// ka:  -
// kd: diffuse texture map
// ks = ns: specular textute map
// bump: normal for each fragment (used for normal computing and bump mapping)

  varying vec3 v_position;
  varying vec3 v_normal; // surface normal
  varying vec3 v_tangent; // useful for the computing of the tangent space
  varying vec3 v_surfaceToView; // V
  varying vec2 v_texcoord;

  // textures
  uniform sampler2D diffuseMap;
  uniform sampler2D normalMap;
  uniform sampler2D specularMap;
  uniform sampler2D emissiveMap;

  // material data (to use according with the textures if available)
  uniform vec3 diffuse; // kd
  uniform vec3 ambient; // ka
  uniform vec3 emissive; // ke
  uniform vec3 specular; // ks
  uniform float shininess; // ns
  uniform float opacity; // d
  
  uniform vec3 u_lightPosition; // light position
  uniform vec3 ambientColor; // default

  void main () {
    // compute color from the specular and diffuse map
    vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
    vec4 specularMapColor = texture2D(specularMap, v_texcoord);
    vec4 emissiveMapColor = texture2D(emissiveMap, v_texcoord);

    // compute the normal according to the normal texture
    vec3 normal = normalize(v_normal);
    vec3 tangent = normalize(v_tangent);

    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
    normal = normalize(tbn * normal); // normal of the fragment

    // calc N and L for diffuse reflection component
    // N = normal we've already computed
    vec3 L = normalize(u_lightPosition - v_position);

    // lambert law
    float lambertian = max(dot(normal, L), 0.0);
    float I_s = 0.; 
    if(lambertian > 0.0) {
      // calc R and V for specular reflection component
      vec3 R = reflect(-L, normal); // reflected light vector
      vec3 V = normalize(v_surfaceToView); // surface to viewer
      // vec3 V = normalize(-v_position); 

    // compute the specular component
      float specAngle = max(dot(R, V), 0.0);
      I_s = pow(specAngle, shininess);
    }

    // emissive component
    vec3 emissiveComponent = emissive * emissiveMapColor.rgb; 

    // phong equation
    gl_FragColor = vec4(
      emissiveComponent +
      ambient * ambientColor +
      diffuse * lambertian * diffuseMapColor.rgb +
      specular * I_s * specularMapColor.rgb,
      opacity * diffuseMapColor.a // effetcive opacity
      );     

  }