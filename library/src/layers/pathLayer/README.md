# DESIPathLayer Upgrade Guide

Upgrades will likely works without problems. If not, follow the directions below

If you want to update `DESIPathLayer`, copy the vertex shader from the `PathLayer` in the deck.gl version you are trying to target and replace the following line:

```glsl
vec2 offsetVec = mix(miterVec * miterSize, perp, step(0.5, cornerPosition))
```

with:

```glsl
vec2 offsetVec = mix(perp, miterVec * miterSize, step(0.5, isJoint))
```
