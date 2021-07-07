// PHONG MODEL
precision highp float;

  varying vec3 v_position;
  varying vec3 v_normal;
  varying vec3 v_tangent;
  varying vec3 v_surfaceToView;
  varying vec2 v_texcoord;

  uniform sampler2D diffuseMap;
  uniform sampler2D normalMap;
  uniform sampler2D specularMap;
  uniform sampler2D emissiveMap;

  // material data (to use together with textures if they are available)
  uniform vec3 diffuse; // kd
  uniform vec3 ambient; // ka
  uniform vec3 emissive; // ke
  uniform vec3 specular; // ks
  uniform float shininess; // ns
  uniform float opacity; // d
  
  uniform vec3 u_lightPosition;
  uniform vec3 ambientColor;

  void main () {
    // compute colors from the specular, diffuse and emissive map
    vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
    vec4 specularMapColor = texture2D(specularMap, v_texcoord);
    vec4 emissiveMapColor = texture2D(emissiveMap, v_texcoord);

    // compute the normal according to the normal texture
    vec3 normal = normalize(v_normal);
    vec3 tangent = normalize(v_tangent);

    vec3 bitangent = normalize(cross(normal, tangent));
    mat3 tbn = mat3(tangent, bitangent, normal);
    normal = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
    normal = normalize(tbn * normal); // final normal of the fragment

    // calc L for diffuse component (we've already computed the normal N)
    vec3 L = normalize(u_lightPosition - v_position);

    float lambertian = max(dot(normal, L), 0.0);

    // specular reflection component
    float I_s = 0.;
    if(lambertian > 0.0) {
      vec3 R = reflect(-L, normal); // reflected light vector
      vec3 V = normalize(v_surfaceToView);

      float specAngle = max(dot(R, V), 0.0);
      I_s = pow(specAngle, shininess);
    }

    vec3 emissiveComponent = emissive * emissiveMapColor.rgb; 

    gl_FragColor = vec4(
      emissiveComponent +
      ambient * ambientColor +
      diffuse * lambertian * diffuseMapColor.rgb +
      specular * I_s * specularMapColor.rgb,
      opacity * diffuseMapColor.a
      );     

  }