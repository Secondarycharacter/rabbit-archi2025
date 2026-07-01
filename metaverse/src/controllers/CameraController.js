function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function damp(current, target, lambda, deltaSeconds) {
  return current + (target - current) * (1 - Math.exp(-lambda * deltaSeconds));
}

function dampAngle(current, target, lambda, deltaSeconds) {
  let delta = target - current;

  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;

  return current + delta * (1 - Math.exp(-lambda * deltaSeconds));
}

export function createCameraController(BABYLON, scene, camera, options = {}) {
  const {
    minDistance = 2,
    maxDistance = 8,
    defaultDistance = 4,
    heightOffset = 1.65,
    shoulderOffset = 0.45,
    mouseSensitivity = 0.0022,
    minPitch = -30,
    maxPitch = 60,
    autoReturnDelayMs = 1800,
    stopReturnDelayMs = 400,
    autoReturnSpeed = 2.4,
    positionDamping = 8,
    stopPositionDamping = 18,
    collisionPadding = 0.25,
    collisionMask = null,
    cameraFloor2WallNormalMaxY = 0.35,
    cameraFloor2CeilingMargin = 0.12
  } = options;

  let yaw = 0;
  let pitch = BABYLON.Tools.ToRadians(12);
  let distance = defaultDistance;
  let targetDistance = defaultDistance;
  let lastMouseMoveAt = performance.now();
  let lastMovementAt = performance.now();
  let autoReturnEnabled = true;

  const minPitchRad = BABYLON.Tools.ToRadians(minPitch);
  const maxPitchRad = BABYLON.Tools.ToRadians(maxPitch);
  const desiredPosition = new BABYLON.Vector3();
  const lookAtTarget = new BABYLON.Vector3();
  const rayDirection = new BABYLON.Vector3();
  const rayOrigin = new BABYLON.Vector3();
  const lookAtOffset = new BABYLON.Vector3();

  function applyMouseDelta(deltaX, deltaY) {
    if (deltaX !== 0 || deltaY !== 0) {
      lastMouseMoveAt = performance.now();
      autoReturnEnabled = false;
    }

    yaw += deltaX * mouseSensitivity;
    pitch = clamp(pitch + deltaY * mouseSensitivity, minPitchRad, maxPitchRad);
  }

  function applyWheelDelta(wheelDelta) {
    if (wheelDelta === 0) {
      return;
    }

    targetDistance = clamp(
      targetDistance + wheelDelta * 0.004,
      minDistance,
      maxDistance
    );
  }

  function isCameraBlockingHit(hit, rayOriginPoint) {
    if (!hit?.pickedMesh) {
      return false;
    }

    if (!hit.pickedMesh.metadata?.angjiCameraBlockingRequiresWallNormal) {
      return true;
    }

    const normal = hit.getNormal?.(true);

    if (!normal) {
      return true;
    }

    if (Math.abs(normal.y) <= cameraFloor2WallNormalMaxY) {
      return true;
    }

    // Flat horizontal Floor2: block ceilings above the aim point, not walkable floors below.
    return hit.pickedPoint.y > rayOriginPoint.y + cameraFloor2CeilingMargin;
  }

  function resolveCollision(anchorPosition, desiredCameraPosition) {
    if (!collisionMask) {
      return desiredCameraPosition;
    }

    rayOrigin.copyFrom(anchorPosition).addInPlace(lookAtOffset);
    desiredCameraPosition.subtractToRef(rayOrigin, rayDirection);

    const rayLength = rayDirection.length();
    if (rayLength <= 0.001) {
      return desiredCameraPosition;
    }

    rayDirection.scaleInPlace(1 / rayLength);
    const ray = new BABYLON.Ray(rayOrigin, rayDirection, rayLength);
    const predicate = (mesh) => (
      mesh.isEnabled()
      && mesh.isPickable !== false
      && (
        Boolean(mesh.metadata?.angjiCameraBlockingSurface)
        || collisionMask(mesh)
      )
    );

    let hit = null;

    if (typeof scene.multiPickWithRay === "function") {
      hit = (scene.multiPickWithRay(ray, predicate) || [])
        .filter((candidate) => candidate?.hit && candidate.pickedPoint && candidate.pickedMesh)
        .filter((candidate) => isCameraBlockingHit(candidate, rayOrigin))
        .sort((a, b) => a.distance - b.distance)[0] || null;
    } else {
      hit = scene.pickWithRay(ray, predicate);
      hit = isCameraBlockingHit(hit, rayOrigin) ? hit : null;
    }

    if (!hit?.hit || hit.distance >= rayLength) {
      return desiredCameraPosition;
    }

    const safeDistance = Math.max(hit.distance - collisionPadding, minDistance * 0.5);
    return rayOrigin.add(rayDirection.scale(safeDistance));
  }

  function update(deltaSeconds, anchorPosition, characterYaw = 0, visualHeight = 1.75, isMoving = false, options = {}) {
    const { preferCharacterYaw = false } = options;
    const now = performance.now();
    const aimHeight = visualHeight * 0.82;
    const cameraBaseHeight = Math.max(heightOffset, visualHeight * 0.42);

    lookAtOffset.set(0, aimHeight, 0);

    if (isMoving) {
      lastMovementAt = now;
    }

    const stoppedLongEnough = now - lastMovementAt >= stopReturnDelayMs;
    const mouseIdleLongEnough = now - lastMouseMoveAt > autoReturnDelayMs;

    if (preferCharacterYaw) {
      lastMovementAt = now;
      autoReturnEnabled = false;
      yaw = dampAngle(yaw, characterYaw + Math.PI, autoReturnSpeed, deltaSeconds);
    } else if (!isMoving && stoppedLongEnough && (autoReturnEnabled || mouseIdleLongEnough)) {
      autoReturnEnabled = true;
      yaw = dampAngle(yaw, characterYaw + Math.PI, autoReturnSpeed, deltaSeconds);
    }

    distance = damp(distance, targetDistance, 10, deltaSeconds);

    const cosPitch = Math.cos(pitch);
    const offsetX = Math.sin(yaw) * cosPitch * distance + Math.cos(yaw) * shoulderOffset;
    const offsetY = Math.sin(pitch) * distance + cameraBaseHeight;
    const offsetZ = Math.cos(yaw) * cosPitch * distance - Math.sin(yaw) * shoulderOffset;

    desiredPosition.set(
      anchorPosition.x + offsetX,
      anchorPosition.y + offsetY,
      anchorPosition.z + offsetZ
    );

    const resolvedPosition = resolveCollision(anchorPosition, desiredPosition);
    const positionLambda = isMoving ? positionDamping : stopPositionDamping;

    camera.position.x = damp(camera.position.x, resolvedPosition.x, positionLambda, deltaSeconds);
    camera.position.y = damp(camera.position.y, resolvedPosition.y, positionLambda, deltaSeconds);
    camera.position.z = damp(camera.position.z, resolvedPosition.z, positionLambda, deltaSeconds);

    lookAtTarget.copyFrom(anchorPosition).addInPlace(lookAtOffset);
    camera.setTarget(lookAtTarget);
  }

  function reset(initialYaw, initialPitch = BABYLON.Tools.ToRadians(12)) {
    yaw = initialYaw + Math.PI;
    pitch = clamp(initialPitch, minPitchRad, maxPitchRad);
    distance = defaultDistance;
    targetDistance = defaultDistance;
    lastMouseMoveAt = performance.now();
    lastMovementAt = performance.now();
    autoReturnEnabled = true;
  }

  function getYaw() {
    return yaw;
  }

  function getFlatAxes() {
    const forwardX = Math.sin(yaw);
    const forwardZ = Math.cos(yaw);
    return {
      forward: new BABYLON.Vector3(forwardX, 0, forwardZ),
      right: new BABYLON.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    };
  }

  return {
    applyMouseDelta,
    applyWheelDelta,
    update,
    reset,
    getYaw,
    getFlatAxes,
    getDistance: () => distance,
    getPitch: () => pitch
  };
}
