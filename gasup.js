const $ = document.querySelector.bind(document);
const $all = document.querySelectorAll.bind(document);

// Generate a random number around `number` with range `bounds`
function fuzz(number, bounds) {
  return number + 2 * bounds * (Math.random() - 0.5);
}

// Clamps `value` between `min` and `max`. ie. Return the boundaries if `value` exceeds them.
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Generates a random number from a gaussian distribution around `mu` with standard dev `sigma`
function gauss(mu, sigma) {
  return mu + sigma * clamp(Array.from({length:20}, Math.random).reduce((x,y)=>x+y)-10, -2, 2);
}

// Calculates the angle between two points
function angle(p0, p1) {
  return Math.atan2(p1.y-p0.y, p1.x-p0.x);
}

/**
 * Generates a function that that smoothly interpolates between `start` and `stop`
 * using `lead` and `trail` for the slope before and after `start` and `stop`
 * respectively
 */
function smoothstep(lead, start, stop, trail) {
  const s1 = Math.tan((angle(stop, start)+angle(lead, start))/2);
  const s2 = Math.tan((angle(trail, stop)+angle(start, stop))/2);

  const a0 = s2+s1 - 2*(stop.x-start.x);
  const a1 = 3*(stop.x-start.x) - (s2+2*s1);
  const a2 = s1;
  const a3 = start.x;
  return d => ((a0*d + a1)*d + a2)*d + a3;
}

// Returns a random item from the array
Array.prototype.sample = function() {
  return this[Math.floor(Math.random() * this.length)];
}

// Rendering Helpers

// Applies props to svg object el
function svgProps(el, props) {
  for (prop in props)
    el.setAttribute(prop, props[prop]);
  return el;
}

// Creates an svg with tag `tag`, applies `props`, and gives it `children`
function svg(tag, props, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  svgProps(el, props);
  children.map(el.appendChild.bind(el));
  return el;
}

// Creates an rgb color given shade of grey
function gray(shade) {
  return `rgb(${shade},${shade},${shade})`;
}

// Smoothly interpolates between colors a and b as a function of t
function lerpColor(a, b, t) { 
  let aHex = parseInt(a.replace(/#/g, ''), 16),
      aRed = aHex >> 16, aGreen = aHex >> 8 & 0xff, aBlue = aHex & 0xff,
      bHex = parseInt(b.replace(/#/g, ''), 16),
      bRed = bHex >> 16, bGreen = bHex >> 8 & 0xff, bBlue = bHex & 0xff,
      red = aRed + t * (bRed - aRed),
      green = aGreen + t * (bGreen - aGreen),
      blue = aBlue + t * (bBlue - aBlue);
  return '#' + ((1 << 24) + (red << 16) + (green << 8) + blue | 0).toString(16).slice(1);
}

// Scales a number based on the width or height of the display
function scale(s) {
  return s*Math.min(document.body.clientWidth, document.body.clientHeight);
}

// Removes the width/height scale from a number
function unscale(s) {
  return s/Math.min(document.body.clientWidth, document.body.clientHeight);
}

// Calculates a svg path for any line around a circle
function calcSvgLinePath(x, y, start, stop, deg) {
  return `M ${
    x + Math.cos(-deg) * start
  } ${
    y + Math.sin(-deg) * start
  } L ${
    x + Math.cos(-deg) * stop
  } ${
    y + Math.sin(-deg) * stop
  }`;
}

// Creates a sprite using svg use from def `id`
function useSprite(id) {
  var sprite = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  sprite.setAttributeNS('http://www.w3.org/1999/xlink','href', id);
  return sprite;
}

// Generates an SVG rectangle
function rect(x, y, width, height, rot, color, glow) {
  return svg('rect', {
    x, y, width, height,
    transform: `rotate(${rot},${x+width/2},${y+height/2})`,
    fill: gray(color),
    ...(glow ? {
      stroke: gray(Math.min(color+20, 255)),
      'stroke-width': 5,
      'stroke-dasharray': `0 ${width + height} ${width + height}`
    } : {})
  });
}


// Specific Drawing Functions
// Calculates a svg path for a guage facing `deg`
function calcGaugeLine(deg) {
  return calcSvgLinePath(150, 150, 15,75, deg);
}

// Set the position of the plane
function setPlanePosition(x, y, deg) {
  svgProps($('#plane'), {
    transform: `translate(${x} ${y}) rotate(${deg}) scale(0.2 0.2)`,
  });
}

// Particles
const particles = [];
function particle(x, y, size, color, lifeSpan, fn) {
  let svg_ = svg('rect', {
    x: x - size/2,
    y: y - size/2,
    width: size,
    height: size,
    fill: color,
  });
  let obj = {
    svg: svg_, x, y,
    lifeTime: lifeSpan,
  };
  fn = fn.bind(obj);
  obj.tick = (lifeTime, delta) => {
    svgProps(svg_, fn(Math.max(0, lifeTime / lifeSpan), delta));
  };
  svgProps(svg_, fn(0, 0));
  $('#particles').appendChild(svg_);
  particles.push(obj);
}

// Creates a gatling bullet with origin `x`, `y` to move toward angle `angle`
function createGatlingBullet(x, y, angle) {
  const bullet = svg('path', {stroke: '#ffff00', 'stroke-width': 3});
  $('#elems').appendChild(bullet);

  let dist = 63;
  let maxDist = 1000 - Math.random()*200;

  particle(
    x + Math.cos(angle) * 80,
    y - Math.sin(angle) * 80,
    20, '#ffff00', 0.5, function(t, dt) {
      let second = t / 0.9;
      let size = t > 0.9 ? 20 : second * 16;
      this.y -= dt * 50;
      return {
        fill: t > 0.9 ? '#ffff00' : lerpColor('#cccc00', '#000000', 1 - second),
        width: size,
        height: size,
        transform: `rotate(${t * Math.PI * 100} ${this.x} ${this.y})`,
        x: this.x - size/2,
        y: this.y - size/2,
      }
    }
  );

  return {
    svg: bullet,
    x, y, angle,
    tick(deltaTime) {
      dist += deltaTime * 400;
      bullet.setAttribute('d', calcSvgLinePath(x, y, dist, dist + 20, angle));
      
      // TODO: hit detection ;)

      if(dist > maxDist) {
        particle(
          x + Math.cos(angle) * (dist + 20),
          y - Math.sin(angle) * (dist + 20),
          10, '#ffff00', 1, function(t, dt) {
            let second = t / 0.9;
            let size = t > 0.9 ? 10 : second * 8;
            return {
              fill: t > 0.9 ? '#ffff00' : lerpColor('#aaaa00', '#000000', 1 - second),
              width: size,
              height: size,
              transform: `rotate(${t * Math.PI * 100} ${this.x} ${this.y})`,
              x: this.x - size/2,
              y: this.y - size/2,
            }
          });
        return true;
      }
    }
  };
}

/* Creates an anti-air rocket from x, y, to move in `angle` direction */
function createAntiAirRocket(x, y, angle) {
  const rocket = useSprite('#rocket')
  x += Math.cos(angle) * 40;
  y +=  Math.sin(angle) * 40;

  // Create gunsmoke particle from the AA launcher
  particle(
    x,
    y,
    40, '#aaaaaa', 1, function(t, dt) {
      let second = t / 0.9;
      let size = t > 0.9 ? 40 : second * 30;
      this.y -= dt * 50;
      return {
        fill: t > 0.9 ? '#aaaaaa' : lerpColor('#999999', '#000000', 1 - second),
        width: size,
        height: size,
        transform: `rotate(${t * Math.PI * 50} ${this.x} ${this.y})`,
        x: this.x - size/2,
        y: this.y - size/2,
      }
    });

  rocket.setAttribute('transform', `translate(${x} ${y}) scale(0.4 0.4) rotate(${radToDeg * angle})`);
  $('#elems').appendChild(rocket);


  let dist = Math.random() * 3;
  let nextSmoke = 0;
  return {
    svg: rocket,
    x, y, angle,
    tick(deltaTime) {
      dist += deltaTime * 5;
      let currAngle = angle + Math.cos(dist) * Math.PI / 6;

      let playerDist = Math.hypot(y - planePos.y, x - planePos.x);
      let playerTheta = Math.atan2(y - planePos.y, x - planePos.x);

      if(playerDist < 250) {
        dist -= deltaTime * 2;
        angle = Math.atan2(
          Math.sin(angle) - Math.sin(playerTheta) * deltaTime * 2,
          Math.cos(angle) - Math.cos(playerTheta) * deltaTime * 2);
      }

      x += Math.cos(currAngle) * 200 * deltaTime;
      y += Math.sin(currAngle) * 200 * deltaTime;

      rocket.setAttribute('transform', `translate(${x} ${y}) scale(0.4 0.4) rotate(${radToDeg * currAngle + 90})`);
      
      nextSmoke -= deltaTime;
      if(nextSmoke < 0) {
        nextSmoke = 0.1;

        // Create trail particle from rocket
        particle(
          x - Math.cos(currAngle) * 50,
          y - Math.sin(currAngle) * 50,
          15, 'transparent', 1, function(t, dt) {
            let second = t / 0.9;
            let size = t > 0.9 ? 15 : second * 10;
            this.x -= Math.cos(currAngle) * dt * 100;
            this.y -= Math.sin(currAngle) * dt * 100;
            return {
              fill: t > 0.9 ? 'transparent' : lerpColor('#999999', '#000000', 1 - second),
              width: size,
              height: size,
              transform: `rotate(${t * Math.PI * 200} ${this.x} ${this.y})`,
              x: this.x - size/2,
              y: this.y - size/2,
            }
          });
      }

      // TODO: hit detection ;)

      // Kill projectile after max dist or when near player
      if(dist > 40 || playerDist < 50) {
        if(playerDist < 400) 
          screenRumble = 0.4;
        particle(
          x,
          y,
          50, '#ffff00', 1, function(t, dt) {
            let second = t / 0.9;
            let size = t > 0.9 ? 50 : second * 30;
            return {
              fill: t > 0.9 ? '#ffff00' : lerpColor('#aaaa00', '#000000', 1 - second),
              width: size,
              height: size,
              transform: `rotate(${t * Math.PI * 50} ${this.x} ${this.y})`,
              x: this.x - size/2,
              y: this.y - size/2,
            }
          });
        return true;
      }
    }
  }
}


const gameObjects = [];

/* Creates a gatling gun object at a given position facing right if direction */
function createGatlingGun(x, y, direction) {
  let dir = direction ? -1 : 1;
  let baseSprite = useSprite('#gatling-base');
  let gunSprite = useSprite('#gatling-gun');
  const group = svg('g', {}, baseSprite, gunSprite);

  baseSprite.setAttribute('transform', `translate(${x} ${y}) scale(0.4 0.4)`);
  gunSprite.setAttribute('transform', `translate(${x} ${y}) scale(${dir * 0.4} 0.4)`);

  $('#elems').appendChild(group);
  let lastShot = 0;
  let renderAngle = 0;
  let burstCounter = 5;

  let gun = {
    svg: group,
    x, y, direction,
    tick(deltaTime) {
      let playerDist = Math.hypot(y - planePos.y, x - planePos.x);
      let angle = (direction ? Math.PI : 0) + Math.atan2(y - planePos.y, x - planePos.x) * dir;
      if(angle > Math.PI)
        angle = -2 * Math.PI + angle;
      if(playerDist < GAT_TURRET_RANGE && Math.abs(angle) < Math.PI / 6) {
        // Calculate angle between turret and player

        // Clamp angle
        angle = Math.max(-Math.PI/6, Math.min(Math.PI/6, angle));

        // Rotate the turret to point at the player
        lastShot -= deltaTime;
        if(lastShot < 0) {
          lastShot = 0.1;
          if(--burstCounter <= 0) {
            lastShot = 1;
            burstCounter = 5;
          }
          let offset = (Math.random() - 0.5) * 0.1;
          gameObjects.push(createGatlingBullet(x, y, (direction ? 0 : Math.PI) - renderAngle * dir + offset));
        }
      } else {
        angle = Math.sin(Date.now() * 0.001 + x * 3 + y * 2) * Math.PI/6;
      }

      renderAngle += (angle - renderAngle) * deltaTime * 2;

      gunSprite.setAttribute('transform', `translate(${x} ${y}) scale(${dir * 0.4} 0.4) rotate(${radToDeg * renderAngle})`);

    }
  };
  return gun;
}


/* Creates an anti-air launcher object at a given position facing right if direction */
function createAntiAir(x, y, direction) {
  let dir = direction ? -1 : 1;
  let baseSprite = useSprite('#anti-air-base');
  const group = $svg('g', {}, baseSprite);

  baseSprite.setAttribute('transform', `translate(${x} ${y}) scale(${dir * 0.4} 0.4)`);
  
  $('#elems').appendChild(group);
  let lastShot = 0;

  let gun = {
    svg: group,
    x, y, direction,
    tick(deltaTime) {
      let playerDist = Math.hypot(y - planePos.y, x - planePos.x);

      if(playerDist < ANTIAIR_TURRET_RANGE) {
        // Rotate the turret to point at the player
        lastShot -= deltaTime;
        if(lastShot < 0) {
          lastShot = 2;

          let offset = (Math.random() - 0.5) * 0.2;
          gameObjects.push(createAntiAirRocket(x, y - 20, (direction ? 0 : Math.PI) + Math.PI / 9 * dir + offset));
        }
      }
    }
  };
  return gun;
}


// Gravity that is applied to the plane in pixels per second
const GRAVITY = 400;

// Max player speed in pixels per second
const MAX_SPEED = 500;
// Player throttle speed
const THROTTLE_SPEED = 25;

// Range in which a gatling turret can see a player
const GAT_TURRET_RANGE = Math.min(scale(1));
const ANTIAIR_TURRET_RANGE = GAT_TURRET_RANGE;

// Plane transform
let planePos = {angle: Math.PI/2, x: 450, y: 0, vx: 0, vy: -200};


/* Rotate the gas gauge an `amount` from 0 to 1*/
function setGas(amount) {
  svgProps($('#gas-gauge'), {
    d: calcGaugeLine(Math.PI * ((1 - amount) * 1.28 + 0.22)),
    stroke: amount < 0.2
      ? lerpColor('#ff7722', '#ffff22', Math.sin(Date.now() * 0.01) * 0.5 + 0.5)
      : '#77ff22',
  });
}

/* Rotate the rpm gauge an `amount` from 0 to 1*/
function setRpm(amount) {
  $('#rpm-gauge').setAttribute('d', calcGaugeLine(Math.PI * ((1 - amount) * 1.67 + 1.67)));
}


// Dot between two vecotrs
function vecDot(a, b) {
  return a.x*b.x + a.y*b.y;
}

// Length of a vector
function vecLen(a) {
  return Math.hypot(a.x, a.y);
}

// Adds two vectors together
function vecAdd(a, b) {
  return {x: a.x+b.x, y: a.y+b.y};
}

// Scale vector
function vecScale(v, mag) {
  return {x: v.x*mag, y: v.y*mag};
}

// Normalizes a vector
function vecNormal(v) {
  const abs = vecLen(v);
  return {x: v.x/abs, y: v.y/abs};
}

// Rotates a vector by `rad` radians
function vecRotate(v, rad) {
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return {x: vecDot(v, {x: cos, y: -sin}),
          y: vecDot(v, {x: sin, y: cos})};
}

// Creates vector from polar coords
function vecFromPolar(theta, mag) {
  return {x: Math.cos(theta) * mag, y: Math.sin(theta) * mag};
}

const deg = rad => 180 * rad / Math.PI;

// Promise for next frame, resolves high quality timestamp
function nextFrame() {
  return new Promise(window.requestAnimationFrame);
}

function resolveGen(gen) {
  return (typeof(gen) === "function") ? gen() : gen;
}

// Generator stuff
function* group(n, gen_) {
  const gen = resolveGen(gen_);
  while (true)
    yield Array.from({length:n}, ()=>gen.next().value);
}

function lazyList(generator_) {
  const generator = (typeof generator_ === "function") ? generator_() : generator_;
  return new Proxy([], {
    get: (target, prop) => {
      const num = Number(prop);
      if (!(prop in target) && Number.isSafeInteger(num))
        while (target.length <= num)
          target.push(generator.next().value);
      return target[prop];
    }
  })
}


// TerrainGen
const terrainGroupSize = 20;
function generateTerrain() {
  const pointDeltaY = 0.5;

  const terrainPath = lazyList(function*() {
    let lastPoint = 0;
    for (let y = 0;; y += pointDeltaY)
      yield {
        x: lastPoint=gauss(lastPoint, 0.15),
        y,
        width: fuzz(0.8, 0.2)
      };
  });

  return lazyList(group(terrainGroupSize, function*() {
    for (let i = 0;; ++i) {
      const points = [terrainPath[i], terrainPath[i+1]];
      const segments = [
        (i-1 >= 0) ? terrainPath[i-1] : {x: 0, y: -pointDeltaY, width: 0.5},
        ...points, terrainPath[i+2]
      ];
      const leftSpline = smoothstep(...segments.map(({x, y, width}) => ({x: x-width/2, y})));
      const rightSpline = smoothstep(...segments.map(({x, y, width}) => ({x: x+width/2, y})));

      const nPoints = 10;

      for (let i = 0; i < nPoints; ++i) {
        const y = points[0].y + (i/nPoints)*(points[1].y-points[0].y);
        const common = rot => ({y, rot: fuzz(rot + 45, 45), size: gauss(0.07, 0.02)});
        yield {
          left: {x: leftSpline(i/nPoints), ...common(180)},
          right: {x: rightSpline(i/nPoints), ...common(0)}
        }
      }
    }
  }));
}


// Function that tells devices to use fullscreen
function requestFullscreen() {
  const e = document.documentElement;
  const req = e.requestFullscreen || e.mozRequestFullScreen
        || e.webkitRequestFullScreen || docEl.msRequestFullscreen;
  if (!document.fullscreenElement && !document.mozFullScreenElement
      && !document.webkitFullscreenElement && !document.msFullscreenElement)
    req.call(e);
}

async function main() {
  // Keyboard Handling
  const keyboard = {};
  window.addEventListener('keydown', e => {
    keyboard[e.code] = true;
  }, false);
  window.addEventListener('keyup', e => {
    keyboard[e.code] = false;
  }, false);


  // Touch event handling
  const touch = {down: false, pos: {x: 0, y: 0}};
  function handleTouch({touches}) {
    if (touch.down = !!touches.length) {
      touch.pos.x = touches.map(x=>x.clientX).reduce((x,y)=>x+y)/touches.length;
      touch.pos.y = touches.map(x=>x.clientY).reduce((x,y)=>x+y)/touches.length;
    }
  }
  ['start', 'end', 'move'].map(x=>document.body.addEventListener('touch'+x, handleTouch, false));

  // Prevent touch events from being registered as clicks and reuqest full screen
  document.body.addEventListener('click', e => {e.preventDefault(); requestFullscreen();}, false);

  // Creates a lazy list of terrain elements
  const terrain = generateTerrain();

  let highestTerrainElement = -1;
  let groupNum = -1;

  // Properties of the current game
  const planeBodyColor = [
      'red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'
  ].sample();
  $all('.plane-body').forEach(
    e => e.setAttribute('fill', planeBodyColor)
  );

  // Guages
  let gasAmount = 1;
  let gasRenderAmount = 1;
  let gasInertia = 0;
  let rpmRenderAmount = 0;
  let rpmInertia = 0;

  // Time between gas particles
  let gasParticle = 0;

  // Seconds of altitude glow
  let altGlow = 0, maxAlt = +localStorage.maxAlt || 0;
  $('#alt-text').textContent = Math.floor(maxAlt);

  // Seconds of title sequence
  let titleSequence = 2;

  // Seconds of screen rumble
  let screenRumble = 0;

  const initialFrameTime = await nextFrame();

  let frameCounter = 0;
  let frameCounterTime = initialFrameTime;

  let frameTime = initialFrameTime;

  while (true) {
    const deltaTime = Math.min(-(frameTime - (frameTime = await nextFrame())) / 1000, 0.1);
    frameCounter++;
    if (frameTime - frameCounterTime > 1000) {
      frameCounter = 0;
      frameCounterTime = frameTime;
    }

    const {clientWidth: width, clientHeight: height} = document.body;

    // Title sequence animation
    if (titleSequence > 0) {
      titleSequence -= deltaTime;

      if(titleSequence > 1.25) {
        let grad = (2 - titleSequence) / 0.75;
        svgProps($('#title-text'), {
          x: width/2,
          y: height/2 + 200 - grad ** 3 * 200,
          'font-size': grad ** 3 * 100 + 20,
          opacity: grad * 0.6,
        });

      } else if(titleSequence < 0.75) {
        let grad = titleSequence / 0.75;
        svgProps($('#title-text'), {
          x: width/2,
          y: height/2 - (1 - grad) * 500,
          'font-size': grad ** 2 * 20 + 100,
          opacity: grad * 0.6,
          fill: 'white',
          transform: `rotate(0)`,
        });

      } else {
        let grad = (titleSequence - 0.75) / 0.5;
        svgProps($('#title-text'), {
          x: width/2,
          y: height/2,
          'font-size': Math.sin(grad * Math.PI) * 15 + 120,
          fill: '#9999ff',
          transform: `rotate(${Math.sin(grad * Math.PI * 2) * 4} ${width/2} ${height/2})`,
          opacity: 0.9,
        });
      }
    } else {
      titleSequence = 0;
    }

    // Run game logic for gameObjects, cull when necessary
    gameObjects.map((e, i) => {
      if(e.tick(deltaTime)) {
        e.svg.parentNode.removeChild(e.svg);
        gameObjects.splice(i, 1);
      }
    });

    // Run logic for particles, cull when lifetime runs out
    particles.map((e, i) => {
      e.lifeTime -= deltaTime;
      e.tick(e.lifeTime, deltaTime);
      if(e.lifeTime <= 0) {
        e.svg.parentNode.removeChild(e.svg);
        particles.splice(i, 1);
      }
    });

    // Give the gas gauge a nice smooth feeling
    gasInertia += (gasAmount - gasRenderAmount) * 0.8 * deltaTime;
    gasInertia -= 3 * gasInertia * deltaTime;
    gasRenderAmount += gasInertia * deltaTime * 20;
    setGas(gasRenderAmount);

    // How fast the plane should turn
    let deltaAngle = 0;

    // How much throttle to apply to plane
    let throttle = 0;

    // Plane rotation controls
    if(keyboard.KeyA) {
      deltaAngle += -Math.PI * 2;
    }
    
    if(keyboard.KeyD) {
      deltaAngle += Math.PI * 2;
    }

    // Touch/mobile controls
    let xTouch = touch.pos.x/width;
    let yTouch = touch.pos.y/height;
    if(touch.down && xTouch < 0.40) {
      deltaAngle -= Math.PI * 2 * (1 - xTouch / 0.40);
    }

    if(touch.down && xTouch > 0.60) {
      deltaAngle += Math.PI * 2 * (xTouch - 0.60) / 0.40;
    }

    if(touch.down) {
      throttle = yTouch;
    }

    // Rotate plane
    planePos.angle += deltaAngle * deltaTime;

    if(keyboard.KeyW) {
      throttle = 1;
    }

    // Rotate plane prop based on throttle
    $('#plane-prop').setAttribute('ry', Math.sin(frameTime * (0.02 + 0.8 * throttle)) * 60 + 60);

    gasAmount -= deltaTime * throttle * 0.03;
    // Increase gas particle rate when throttling
    gasParticle -= deltaTime * throttle + deltaTime;

    // Emit gas particles
    if(gasParticle < 0) {
      gasParticle = 0.2;
      const gasAngle = planePos.angle + Math.PI / 5 + Math.random() * 0.2 - 0.1;
      const gasSize = Math.random() * 20 + 10;
      const gasSpeed = throttle + 1;
      particle(
        planePos.x + Math.cos(gasAngle) * 15,
        planePos.y + Math.sin(gasAngle) * 15,
        gasSize, '#ccc', 0.7, function(t, dt) {
          let size = t * 0.6 * gasSize + gasSize * 0.4;
          this.x += Math.cos(gasAngle) * dt * 80 * gasSpeed;
          this.y += Math.sin(gasAngle) * dt * 80 * gasSpeed;
          return {
            opacity: t * 0.3 + 0.1,
            width: size,
            height: size,
            transform: `rotate(${t * Math.PI * 20} ${this.x} ${this.y})`,
            x: this.x - size/2,
            y: this.y - size/2,
          }
        });
    }

    // TODO: remove debug refill gas
    if(gasAmount < 0)
      gasAmount = 1;

    let accelDir = {
      x: Math.cos(planePos.angle + Math.PI) * THROTTLE_SPEED * throttle,
      y: Math.sin(planePos.angle + Math.PI) * THROTTLE_SPEED * throttle,
    };

    // Calculate new velocity based on projected velocity and previous velocity
    let prevVel = {x: planePos.vx, y: planePos.vy};
    let projVel = vecDot(prevVel, vecNormal(accelDir));
    let accelVel = throttle * THROTTLE_SPEED * deltaTime;

    if(projVel + accelVel > MAX_SPEED)
      accelVel = Math.max(MAX_SPEED - projVel, 0);

    let newVel = vecAdd(prevVel, vecScale(accelDir, accelVel));

    // Calculate how much impact the wings have on movement direction
    let wingDir = vecFromPolar(planePos.angle, 1);
    let inertia = deltaTime * 4;
    newVel = vecAdd(vecScale(newVel, 1 - inertia), vecScale(wingDir, vecDot(newVel, wingDir) * inertia));

    // Smooth render the rpm gauge
    let rpmAmount = Math.max(Math.min(-vecDot(newVel, wingDir) / 500, 1), 0);
    rpmInertia += (rpmAmount - rpmRenderAmount) * 0.8 * deltaTime;
    rpmInertia -= 6 * rpmInertia * deltaTime;
    rpmRenderAmount += rpmInertia * deltaTime * 40;
    setRpm(Math.min(Math.max(rpmRenderAmount, 0), 1.1));

    // Update plane velocity, apply gravity
    planePos.vx = newVel.x;
    planePos.vy = newVel.y;
    planePos.vy += GRAVITY * deltaTime; 

    // Gravity and base movement
    planePos.x += planePos.vx * deltaTime;
    planePos.y += planePos.vy * deltaTime;

    // Move plane sprite
    setPlanePosition(planePos.x, planePos.y, deg(planePos.angle));

    // Render the terrain chunk at a time
    if (2-unscale(planePos.y) > highestTerrainElement) {
      groupNum++;
      function makeVertex({x, y}) {
        return `${scale(x)},${scale(1-y)}`;
      }
      const lowerPoly = svg('polygon', {
        points: [
          ...(groupNum > 0 ? [makeVertex(terrain[groupNum-1][terrainGroupSize-1].left)] : []),
          ...terrain[groupNum].map(x=>makeVertex(x.left)),
          ...terrain[groupNum].map(x=>makeVertex(x.right)).reverse(),
          ...(groupNum > 0 ? [makeVertex(terrain[groupNum-1][terrainGroupSize-1].right)] : [])
        ].join(' ')
      });

      const square = ({x, y, rot, size}) => {
        const screenSize = scale(size);
        return rect(scale(x-size/2), scale(1-y-size/2),
                    screenSize, screenSize, rot, 85, true);
      }

      const upperGroup = svg('g', {}, ...[].concat(...terrain[groupNum].map(
        ({left, right}) => [square(left), square(right)]
      )));
      $('#bg').appendChild(lowerPoly);
      $('#fg').appendChild(upperGroup);
      highestTerrainElement = terrain[groupNum][terrainGroupSize-1].left.y;
    }


    let rumbleOffX = 0;
    let rumbleOffY = 0;
    // Rumble screen increasingly when there is more demand for rumble
    if(screenRumble > 0) {
      screenRumble -= deltaTime;
      rumbleOffX = (Math.random() - 0.5) * screenRumble * 50;
      rumbleOffY = (Math.random() - 0.5) * screenRumble * 50;
    }

    // Move world to focus on plane
    $('#world').setAttribute('transform', `translate(${
       -planePos.x + width/2 + rumbleOffX
    } ${
       -planePos.y + height/2 + rumbleOffY
    })`);

    // TODO: remove debug position resetting
    if(planePos.y > 1000) {
      planePos.y = 0;
      planePos.x = 0;
      planePos.vx = 0;
      planePos.vy = 0;
    }

    altGlow -= altGlow * deltaTime * 5;
    // Glow the altitude indicator every time a new milestone is reached
    if(maxAlt < Math.floor(-planePos.y/250)) {
      maxAlt = Math.floor(-planePos.y/250);
      localStorage.maxAlt = maxAlt;
      $('#alt-text').textContent = Math.floor(maxAlt);
      altGlow = 1;
    }

    // Update altitude indicator appearance
    svgProps($('#alt-text'), {
      opacity: altGlow * 0.6 + 0.4,
      'font-size': altGlow * 5 + 30,
      y: 80 + altGlow * 2.5,
    });
  }
}

window.addEventListener('load', () => {
  main();
});