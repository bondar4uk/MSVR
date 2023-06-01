'use strict';

let gl;
let surface;
let surface2;
let shProgram;
let spaceball;
let canvas;
let C = 3;
let f_u;
let a_uv;
let r_uv;
let image_src = "texture/texture.jpg";
let video_src = "texture/texture_vid.mp4";
let copyVideo = false;
let texture_type = "image";

let World_X = 0;
let World_Y = 0;
let World_Z = 0;

let CanvasWidth;
let CanvasHeight;
let video;
let video_cam;
let TextureWebCam;
let SurfaceTexture;
let SphereTexture;
let BackgroundVideoModel;
let Sphere;

let image;

let stereoCamera = new StereoCamera(5, 0, 1, 1, 4, 100);

let audio = null;
let audioContext;
let audioSource;
let audioPanner;
let audioFilter;
let reverbNode;
let centerFrequencyInput = 1000;
let Q_value = 5;
let Volume = 1;
let PlaybackRate = 1;

let timeStamp;
let x,
    y,
    z;

function readGyroscope() {
    var gyroPresent = navigator.userAgentData.mobile;

    if (gyroPresent) {
        timeStamp = Date.now();
        let sensor = new Gyroscope({
            frequency: 60
        });
        sensor.addEventListener('reading', e => {
            x = sensor.x
            y = sensor.y
            z = sensor.z
        });
        sensor.start();
    } else {
        $('#GyroscopeCheckbox').prop('disabled', true);
        alert('Gyroscope not supported');
    }

}

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices, normals, texCoords) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iTextureCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iTextureCoords);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }

    this.BufferDataSphere = function (vertices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    };

    this.DrawSphere = function () {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    };
}

function ShaderProgram(name, program) {
    this.name = name;
    this.prog = program;

    this.iAttribVertex = -1;
    this.iNormalVertex = -1;
    this.iTextureCoords = -1;

    this.iModelViewProjectionMatrix = -1;

    this.iTexture = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}

function draw() {
    if (audioPanner) {
        audioFilter.frequency.value = centerFrequencyInput;
        audioFilter.Q.value = Q_value;
        audio.volume = Volume;
        audio.playbackRate = PlaybackRate;

        if (GyroscopeRotate) {
            audioPanner.setPosition(
                (x * 1000).toFixed(2),
                (y * 1000).toFixed(2),
                (z * 1000).toFixed(2)
            );
        } else {
            audioPanner.setPosition(
                World_X * 1000,
                World_Y * 1000,
                World_Z * 1000
            );
        }
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (camera_ind) {
        DrawWebCamVideo();
    }

    gl.clear(gl.DEPTH_BUFFER_BIT);
    stereoCamera.ApplyLeftFrustum();
    gl.colorMask(true, false, false, false);
    DrawSurface();
    DrawSphere();

    gl.clear(gl.DEPTH_BUFFER_BIT);
    stereoCamera.ApplyRightFrustum();
    gl.colorMask(false, true, true, false);
    DrawSurface();
    DrawSphere();
    gl.colorMask(true, true, true, true);
}

function DrawSurface() {
    let modelView;
    let translateToPointZero;
    if (rotate_spaceball) {
        modelView = spaceball.getViewMatrix();
        translateToPointZero = m4.translation(0, 0, -20);
    } else {
        modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
        translateToPointZero = m4.translation(-1, 0, -20);
    }

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView)));
    gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
    gl.uniform1i(shProgram.iTexture, 0);

    surface.Draw();
}

function DrawSphere() {
    let modelView = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    let translateToPointZero;
    if (GyroscopeRotate) {
        translateToPointZero = m4.translation(x.toFixed(2), y.toFixed(2), (z - 20).toFixed(2));
    } else {
        translateToPointZero = m4.translation(World_X, World_Y, World_Z - 20);
    }

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, m4.multiply(stereoCamera.mModelViewMatrix, m4.multiply(m4.multiply(stereoCamera.mProjectionMatrix, translateToPointZero), modelView)));
    gl.bindTexture(gl.TEXTURE_2D, SphereTexture);
    gl.uniform1i(shProgram.iTexture, 0);

    Sphere.Draw();
}

function DrawWebCamVideo() {
    gl.bindTexture(gl.TEXTURE_2D, TextureWebCam);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video_cam);

    let ViewMatrix = m4.translation(0, 0, 0);
    let projection = m4.orthographic(-CanvasWidth / 2.0, CanvasWidth / 2.0, -CanvasHeight / 2.0, CanvasHeight / 2.0, 1.0, 20000);

    let WorldViewMatrix = m4.multiply(m4.translation(0, 0, -100), ViewMatrix);
    let ModelViewProjection = m4.multiply(projection, WorldViewMatrix);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, ModelViewProjection);

    gl.uniform1i(shProgram.iTexture, 0);

    BackgroundVideoModel.Draw();
}

function CreateSurfaceData() {
    let step = 5.0;
    let DeltaU = 0.0001;
    let DeltaV = 0.0001;

    let vertexList = [];
    let normalsList = [];
    let textureList = [];

    for (let u = -90; u < 90; u += step) {
        for (let v = 0; v < 180; v += step) {
            let unext = u + step;

            let xyz = CalcXYZ(u, v);

            vertexList.push(xyz[0], xyz[1], xyz[2]);

            let DerivativeU = CalcDerivativeU(u, v, DeltaU, xyz);
            let DerivativeV = CalcDerivativeV(u, v, DeltaV, xyz);

            let result = m4.cross(DerivativeV, DerivativeU);
            normalsList.push(result[0], result[1], result[2]);

            xyz = CalcXYZ(unext, v);
            vertexList.push(xyz[0], xyz[1], xyz[2]);

            DerivativeU = CalcDerivativeU(unext, v, DeltaU, xyz);
            DerivativeV = CalcDerivativeV(unext, v, DeltaV, xyz);

            result = m4.cross(DerivativeV, DerivativeU);
            normalsList.push(result[0], result[1], result[2]);

            textureList.push(u / 90, v / 180);
            textureList.push(unext / 90, v / 180);
        }
    }

    return [vertexList, normalsList, textureList];
}

function CalcPar(uRad, vRad) {
    f_u = -deg2rad(uRad) / Math.sqrt(C + 1) + Math.atan(Math.sqrt(C + 1) * Math.tan(deg2rad(uRad)));
    a_uv = 2 / (C + 1 - C * Math.sin(deg2rad(vRad)) * Math.sin(deg2rad(vRad)) * Math.cos(deg2rad(uRad)) * Math.cos(deg2rad(uRad)));
    r_uv = (a_uv / Math.sqrt(C)) * Math.sqrt((C + 1) * (1 + C * Math.sin(deg2rad(uRad)) * Math.sin(deg2rad(uRad)))) * Math.sin(deg2rad(vRad));
    return [f_u, a_uv, r_uv];
}

function CalcXYZ(u, v) {
    let CalcParData = CalcPar(u, v);
    return [CalcParData[2] * Math.cos(CalcParData[0]), CalcParData[2] * Math.sin(CalcParData[0]), (Math.log(deg2rad(v) / 2) + a_uv * (C + 1) * Math.cos(deg2rad(v))) / Math.sqrt(C)];
}

function CalcDerivativeU(u, v, DeltaU, xyz) {
    let Dxyz = CalcXYZ(u + DeltaU, v);

    let Dxdu = (Dxyz[0] - xyz[0]) / deg2rad(DeltaU);
    let Dydu = (Dxyz[1] - xyz[1]) / deg2rad(DeltaU);
    let Dzdu = (Dxyz[2] - xyz[2]) / deg2rad(DeltaU);

    return [Dxdu, Dydu, Dzdu];
}

function CalcDerivativeV(u, v, DeltaV, xyz) {
    let Dxyz = CalcXYZ(u, v + DeltaV);

    let Dxdv = (Dxyz[0] - xyz[0]) / deg2rad(DeltaV);
    let Dydv = (Dxyz[1] - xyz[1]) / deg2rad(DeltaV);
    let Dzdv = (Dxyz[2] - xyz[2]) / deg2rad(DeltaV);

    return [Dxdv, Dydv, Dzdv];
}

function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iNormalVertex = gl.getAttribLocation(prog, "normal");
    shProgram.iTextureCoords = gl.getAttribLocation(prog, "texturecoord");

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iTexture = gl.getUniformLocation(prog, "u_texture");

    surface = new Model('Surface');
    let SurfaceData = CreateSurfaceData();
    surface.BufferData(SurfaceData[0], SurfaceData[1], SurfaceData[2]);

    BackgroundVideoModel = new Model('Camera');
    let BackgroundData = CreateBackgroundData();
    BackgroundVideoModel.BufferData(BackgroundData[0], BackgroundData[1], BackgroundData[2]);

    Sphere = new Model("Sphere");
    Sphere.BufferDataSphere(CreateSphereSurface());
}

function CreateBackgroundData() {
    let vertexList = [-CanvasWidth / 2.0, -CanvasHeight / 2.0, 0,
                        -CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                        CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                        -CanvasWidth / 2.0, -CanvasHeight / 2.0, 0,
                        CanvasWidth / 2.0, CanvasHeight / 2.0, 0,
                        CanvasWidth / 2.0, -CanvasHeight / 2.0, 0];
    let normalsList = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
    let textCoords = [1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1];

    return [vertexList, normalsList, textCoords];
}

function CreateSphereSurface(r = 0.15) {
    let vertexList = [];
    for (let lon = -Math.PI; lon < Math.PI; lon += 0.5) {
        for (let lat = -Math.PI * 0.5; lat < Math.PI * 0.5; lat += 0.5) {
            vertexList.push(
                ...sphereSurfaceData(r, lon, lat),
                ...sphereSurfaceData(r, lon + 0.5, lat),
                ...sphereSurfaceData(r, lon, lat + 0.5),
                ...sphereSurfaceData(r, lon + 0.5, lat + 0.5),
                ...sphereSurfaceData(r, lon + 0.5, lat),
                ...sphereSurfaceData(r, lon, lat + 0.5)
            );
        }
    }
    return vertexList;
}

function sphereSurfaceData(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return [x, y, z];
}

function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}

function init() {
    readGyroscope();
    try {
        canvas = document.getElementById("webglcanvas");

        CanvasWidth = canvas.scrollWidth;
        CanvasHeight = canvas.scrollHeight;

        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    video_cam = document.createElement('video');
    video_cam.setAttribute('autoplay', true);
    window.vid = video_cam;

    navigator.getUserMedia({
        video: true
    }, function (stream) {
        video_cam.srcObject = stream;
        let stream_settings = stream.getVideoTracks()[0].getSettings();
        let stream_width = stream_settings.width;
        let stream_height = stream_settings.height;
        canvas = document.querySelector('canvas');
        gl = canvas.getContext("webgl");
        canvas.width = stream_width;
        canvas.height = stream_height;
        gl.viewport(0, 0, stream_width, stream_height);
    }, function (e) {
        console.error('Rejected!', e);
    });
    SetUpWebCamTexture();
    setTimeout(function () {
        LoadSphereTexture();
        spaceball = new TrackballRotator(canvas, draw, 0);

        if (texture_type == "image") {
            var texture = loadTexture(gl, image_src);
        } else {
            var texture = initTexture(gl);
            var video = setupVideo(video_src);
            var then = 0;

            function render(now) {
                now *= 0.001;
                var deltaTime = now - then;
                then = now;
                if (copyVideo) {
                    updateTexture(gl, texture, video);
                }
                if (texture_type != "image") {
                    requestAnimationFrame(render);
                }
            }
            requestAnimationFrame(render);
        }

        audio = document.getElementById("audio");

        audio.addEventListener("pause", () => {
            audioContext.resume();
        });

        audio.addEventListener("play", () => {
            if (!audioContext) {
                audioContext = new(window.AudioContext || window.webkitAudioContext)();
                audioSource = audioContext.createMediaElementSource(audio);

                audioPanner = audioContext.createPanner();
                audioFilter = audioContext.createBiquadFilter();
                reverbNode = audioContext.createConvolver();

                audioPanner.panningModel = "HRTF";
                audioPanner.distanceModel = "linear";
                audioFilter.type = "bandpass";
                audioFilter.frequency.value = centerFrequencyInput;
                audioFilter.Q.value = Q_value;

                audio.volume = Volume;
                audio.playbackRate = PlaybackRate;

                const reverbUrl = "audio/reverb/BIG_HALL_E001_M2S.wav";
                const reverbRequest = new XMLHttpRequest();
                reverbRequest.open("GET", reverbUrl, true);
                reverbRequest.responseType = "arraybuffer";

                reverbRequest.onload = function () {
                    const audioData = reverbRequest.response;
                    audioContext.decodeAudioData(audioData, function (buffer) {
                        reverbNode.buffer = buffer;
                        audioSource.connect(audioPanner);
                        audioPanner.connect(audioFilter);
                        audioFilter.connect(reverbNode);
                        reverbNode.connect(audioContext.destination);
                    });
                };

                reverbRequest.send();

                audioContext.resume();
            }
        });

        const filter = document.getElementById("filter_check");

        filter.addEventListener("change", function () {
            if (filter.checked) {
                audioPanner.disconnect();
                audioPanner.connect(audioFilter);
                audioFilter.connect(audioContext.destination);
            } else {
                audioPanner.disconnect();
                audioPanner.connect(audioContext.destination);
            }
        });

        const reverbCheckbox = document.getElementById('reverbCheckbox');

        reverbCheckbox.addEventListener('change', () => {
            if (reverbCheckbox.checked) {
                audioFilter.disconnect();
                audioFilter.connect(reverbNode);
                reverbNode.connect(audioContext.destination);
            } else {
                reverbNode.disconnect();
                audioFilter.disconnect();
                audioFilter.connect(audioContext.destination);
            }
        });

        audio.play();

        playVideo();
    }, 500);
}

function playVideo() {
    draw();
    window.requestAnimationFrame(playVideo);
}

function SetUpWebCamTexture() {
    TextureWebCam = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, TextureWebCam);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function initTexture(gl) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    return texture;
}

function updateTexture(gl, texture, video) {
    gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    draw();
}


function setupVideo(url) {
    video = document.createElement("video");
    video.crossOrigin = "anonymous"

    let playing = false;
    let timeupdate = false;

    video.playsInline = true;
    video.muted = true;
    video.loop = true;

    video.addEventListener(
        "playing",
        () => {
            playing = true;
            checkReady();
        },
        true
    );

    video.addEventListener(
        "timeupdate",
        () => {
            timeupdate = true;
            checkReady();
        },
        true
    );

    video.src = url;
    video.play();

    function checkReady() {
        if (playing && timeupdate) {
            copyVideo = true;
        }
    }

    return video;
}

function loadTexture(gl, url) {
    SurfaceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));

    image = new Image();
    image.crossOrigin = "anonymous"
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, SurfaceTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }
        draw();
    };
    image.src = url;

    return SurfaceTexture;
}

function LoadSphereTexture() {
    SphereTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, SphereTexture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));

    const SphereImage = new Image();
    SphereImage.crossOrigin = "anonymus";
    SphereImage.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, SphereTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, SphereImage);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        draw();
    };
    SphereImage.src = "./texture/gold.avif";
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}
