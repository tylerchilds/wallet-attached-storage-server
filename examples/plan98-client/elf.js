const logs = {}

export function insights() {
  return logs
}

function insight(name, link) {
  if(!logs[`${name}:${link}`]) {
    logs[`${name}:${link}`] = 0
  }
  logs[`${name}:${link}`] += 1
}

const CREATE_EVENT = 'create'

const observableEvents = [CREATE_EVENT]
const reactiveFunctions = {}


function react(link) {
  if(!reactiveFunctions[link]) return

  Object.keys(reactiveFunctions[link])
    .map(id => reactiveFunctions[link][id]())
}

const notifications = {
  [react.toString()]: react
}

function notify(link) {
  Object.keys(notifications)
    .map(key => notifications[key](link))
}

const store = createStore({}, notify)


function update(link, target, compositor, lifeCycle={}) {
  insight('elf:update', link)
  if(lifeCycle.beforeUpdate) {
    lifeCycle.beforeUpdate.call(this, target)
  }

  const html = compositor.call(this, target)
  if(html) target.innerHTML = html

  if(lifeCycle.afterUpdate) {
    lifeCycle.afterUpdate.call(this, target)
  }
}

function draw(link, compositor, lifeCycle={}) {
  insight('elf:draw', link)
  if(!reactiveFunctions[link]) {
    reactiveFunctions[link] = {}
  }

  listen(CREATE_EVENT, link, (event) => {
    const draw = update.bind(this, link, event.target, compositor, lifeCycle)
    reactiveFunctions[link][event.target.id] = draw
    draw()
  })
}

function style(link, stylesheet) {
  insight('elf:style', link)
  const styles = `
    <style type="text/css" data-link="${link}">
      ${stylesheet.replaceAll('&', link)}
    </style>
  `;

  document.body.insertAdjacentHTML("beforeend", styles)
}

export function learn(link) {
  insight('elf:learn', link)
  return store.get(link) || {}
}

export function teach(link, knowledge, nuance = (s, p) => ({...s,...p})) {
  insight('elf:teach', link)
  store.set(link, knowledge, nuance)
}

export function when(link, type, arg2, callback) {
  if(typeof arg2 === 'function') {
    insight('elf:when:'+type, link)
    return listen.call(this, type, link, arg2)
  } else {
    const nested = `${link} ${arg2}`
    insight('elf:when:'+type, nested)
    return listen.call(this, type, nested, callback)
  }
}

export default function elf(link, initialState = {}) {
  insight('elf', link)
  teach(link, initialState)

  return {
    link,
    learn: learn.bind(this, link),
    draw: draw.bind(this, link),
    style: style.bind(this, link),
    when: when.bind(this, link),
    teach: teach.bind(this, link),
  }
}

export function subscribe(fun) {
  notifications[fun.toString] = fun
}

export function unsubscribe(fun) {
  if(notifications[fun.toString]) {
    delete notifications[fun.toString]
  }
}

export function listen(type, link, handler = () => null) {
  const callback = (event) => {
    if(
      event.target &&
      event.target.matches &&
      event.target.matches(link)
    ) {

      insight('elf:listen:'+type, link)
      handler.call(this, event);
    }
  };

  const options = { capture: true, passive: false }
  document.addEventListener(type, callback, options);

  if(observableEvents.includes(type)) {
    observe(link);
  }

  return function unlisten() {
    if(type === CREATE_EVENT) {
      disregard(link);
    }

    document.removeEventListener(type, callback, options);
  }
}

let links = []

function observe(link) {
  links = [...new Set([...links, link])];
  maybeCreateReactive([...document.querySelectorAll(link)])
}

function disregard(link) {
  const index = links.indexOf(link);
  if(index >= 0) {
    links = [
      ...links.slice(0, index),
      ...links.slice(index + 1)
    ];
  }
}

function maybeCreateReactive(targets) {
  targets
    .filter(x => !x.reactive)
    .forEach(dispatchCreate)
}

function getSubscribers({ target }) {
  if(links.length > 0)
    return [...target.querySelectorAll(links.join(', '))];
  else
    return []
}

function dispatchCreate(target) {
  insight('elf:create', target.localName)
  try {
    if(!target.id) target.id = self.crypto.randomUUID()
  } catch(e) {
    if(!target.id) target.id = uuidv4()
  }
  target.dispatchEvent(new Event(CREATE_EVENT))
  target.reactive = true
}

const registry = ''
function elves() {
  new MutationObserver((mutationsList) => {
    const targets = [...mutationsList]
      .map(getSubscribers)
      .flatMap(x => x)
    maybeCreateReactive(targets)
  }).observe(document.body, { childList: true, subtree: true });
  modules({ registry })
  new MutationObserver(() => {
    modules({ registry })
  }).observe(document.body, { childList: true, subtree: true });

}

function modules({ registry }) {
  const tags = new Set(
    [...document.querySelectorAll(':not(:defined)')]
    .map(({ tagName }) => tagName.toLowerCase())
  )

  tags.forEach(async (tag) => {
    const url = `${registry || '.'}/${tag}.js`
    const exists = (await fetch(url, { method: 'HEAD' })).ok
    if(!exists) return
    let definable = true
    await import(url).catch((e) => {
      definable = false
      console.error(e)
    })
    try {
      definable = definable && document.querySelector(tag) && document.querySelector(tag).matches(':not(:defined)')
      if(definable) {
        customElements.define(tag, class WebComponent extends HTMLElement {
          constructor() {
            super();
          }
        });
      }
    } catch(e) {
      console.log('Error defining module:', tag, e)
    }
  })
}

try {
  elves()
} catch(e) {
  setTimeout(elves,1000)
}

function createStore(initialState = {}, subscribe = () => null) {
  let state = {
    ...initialState
  };

  return {
    set: function(link, knowledge, nuance) {
      const wisdom = nuance(state[link] || {}, knowledge);

      state = {
        ...state,
        [link]: wisdom
      };

      subscribe(link);
    },

    get: function(link) {
      return state[link];
    }
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
