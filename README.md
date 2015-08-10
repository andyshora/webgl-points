# webgl-points

- Add dokku remote: `git remote add dokku dokku@178.62.102.69:world`

## [Shaders](http://threejs.org/docs/#Reference/Materials/ShaderMaterial)

- Uniforms are variables that have the same value for all vertices---lighting, fog, and shadow maps are examples of data that would be stored in uniforms. Uniforms can be accessed by both the vertex shader and the fragment shader.

- Attributes are variables associated with each vertex---for instance, the vertex position, face normal, and vertex color are all examples of data that would be stored in attributes. Attributes can only be accessed within the vertex shader.

- Varyings are variables that are passed from the vertex shader to the fragment shader. For each fragment, the value of each varying will be smoothly interpolated from the values of adjacent vertices.

## Notes

- If you cannot dyamically add particles, add some extras to use with alpha = 0, and activate them when needed. May be expensive to extend buffer size.

- Find how to move points via gl_Position in a custom shader

## Todo

- Increasing to billions of particles. Proper GPU required, dedicated memory. Faster CPU required for bigger initial world creation. Currently crashing at creation stage probably due to there being no time to recoup memory during the particle loop.

- Google Chrome Helper process crashes when memory exceeds 1.5GB when creating 10M points.

- Investigate [Chrome Native Client](https://developer.chrome.com/native-client)

- Potential to group billions of particles into sub-worlds, which provide finer view when focussed on. Much like marker grouping on maps.

- Consider reducing the renderer.render frequency for higher number of points. At the moment render requests are getting stacked up when aiming for 60fps.

- Throttle mousemove events when numPoints > 1000000

## Adding an app to dokku

- `ssh root@178.62.102.69`
- `dokku help`
- `dokku apps:create app-name`
- `dokku domains:add ...`
- Add dokku remote `dokku@178.62.102.69:app-name`
- `git push dokku master`
