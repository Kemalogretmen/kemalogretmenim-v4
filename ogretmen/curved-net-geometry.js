/* Continuous curved-net geometry; independent from Three.js for numerical checks.
 * Cylinder: a developable, length-preserving sheet and tangent-hinged rigid caps.
 * Sphere: approximate globe gores, not an isometric planar net.
 * Sources:
 * https://newzealandcurriculum.tahurangi.education.govt.nz/solid-understanding/5637167110.p
 * https://blogs.loc.gov/maps/2025/03/globe-gores/
 * https://math.etsu.edu/multicalc/prealpha/Chap3/Chap3-8/part3.htm
 */
(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.CurvedNetGeometry = api;
})(typeof window === 'undefined' ? globalThis : window, function() {
    const TAU = Math.PI * 2;
    const clamp = value => Math.max(0, Math.min(1, value));
    function stage(t, start, end) {
        const v = clamp((t - start) / (end - start));
        return v * v * (3 - 2 * v);
    }
    // Stable values at zero curvature: no threshold jump in the flat sheet.
    function sinc(angle) {
        if (Math.abs(angle) < 1e-4) {
            const a2 = angle * angle;
            return 1 - a2 / 6 + a2 * a2 / 120;
        }
        return Math.sin(angle) / angle;
    }
    function cosc(angle) {
        if (Math.abs(angle) < 1e-4) {
            const a2 = angle * angle;
            return -angle / 2 + angle * a2 / 24 - angle * a2 * a2 / 720;
        }
        return (Math.cos(angle) - 1) / angle;
    }
    const cylinder = Object.freeze({ radius: 52, height: 132 });
    const sphere = Object.freeze({ radius: 82, strips: 12, gap: 10 });
    function cylinderState(t) {
        return {
            lift: stage(t, 0, 0.24) * Math.PI / 2,
            bend: stage(t, 0.24, 0.78),
            lid: stage(t, 0.78, 1) * Math.PI / 2
        };
    }
    function cylinderSide(u, v, t, radius = cylinder.radius, height = cylinder.height) {
        const state = cylinderState(t);
        const s = (u - 0.5) * TAU * radius;
        const angle = s * state.bend / radius;
        const x = s * sinc(angle);
        const normal = s * cosc(angle);
        const length = v * height;
        return {
            x,
            y: length * Math.sin(state.lift) - normal * Math.cos(state.lift),
            z: radius + length * Math.cos(state.lift) + normal * Math.sin(state.lift)
        };
    }
    function cylinderCap(top, t, radius = cylinder.radius, height = cylinder.height) {
        const state = cylinderState(t);
        if (!top) return { x: 0, y: 0, z: 0, rotationX: 0 };
        const angle = state.lift + state.lid;
        return {
            x: 0,
            y: height * Math.sin(state.lift) + radius * Math.sin(angle),
            z: radius + height * Math.cos(state.lift) + radius * Math.cos(angle),
            rotationX: -angle
        };
    }
    function spherePoint(strip, u, v, t, radius = sphere.radius, strips = sphere.strips, gap = sphere.gap) {
        const lift = stage(t, 0, 0.2) * Math.PI / 2;
        const bend = stage(t, 0.2, 0.82);
        const gather = stage(t, 0.36, 1);
        const latitude = (v - 0.5) * Math.PI;
        const longitude = (u - 0.5) * TAU / strips;
        const centerLongitude = (strip - (strips - 1) / 2) * TAU / strips;
        const cosLatitude = Math.abs(v) < 1e-12 || Math.abs(v - 1) < 1e-12 ? 0 : Math.cos(latitude);
        // Both centreline and cross-section bend through circular arcs.  A globe
        // gore necessarily changes its surface metric; only the meridian centre
        // retains its length. At t=1 every sample lies exactly on the same sphere.
        const across = radius * cosLatitude * longitude;
        const localX = across * sinc(bend * longitude);
        const along = radius * latitude;
        const meridian = along * sinc(bend * latitude);
        const depth = along * cosc(bend * latitude) + across * cosc(bend * longitude);
        const localY = meridian * Math.sin(lift) - depth * Math.cos(lift);
        const localZ = meridian * Math.cos(lift) + depth * Math.sin(lift);
        const yaw = gather * centerLongitude;
        const equatorLength = radius * centerLongitude;
        const centerX = equatorLength * sinc(yaw) + (strip - (strips - 1) / 2) * gap * (1 - gather);
        const centerZ = radius + equatorLength * cosc(yaw);
        return {
            x: centerX + localX * Math.cos(yaw) + localZ * Math.sin(yaw),
            y: localY,
            z: centerZ - localX * Math.sin(yaw) + localZ * Math.cos(yaw)
        };
    }
    return Object.freeze({ cylinder, sphere, stage, cylinderState, cylinderSide, cylinderCap, spherePoint });
});
