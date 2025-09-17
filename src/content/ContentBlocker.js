export function ContentBlocker(gotoOriginTab, browser) {
  "use strict";
  function t() {}
  const n = (t) => t;
  function e(t) {
    return t();
  }
  function o() {
    return Object.create(null);
  }
  function i(t) {
    t.forEach(e);
  }
  function r(t) {
    return "function" == typeof t;
  }
  function s(t, n) {
    return t != t
      ? n == n
      : t !== n || (t && "object" == typeof t) || "function" == typeof t;
  }
  const a = "undefined" != typeof window;
  let c = a ? () => window.performance.now() : () => Date.now(),
    l = a ? (t) => requestAnimationFrame(t) : t;
  const u = new Set();
  function f(t) {
    u.forEach((n) => {
      n.c(t) || (u.delete(n), n.f());
    }),
      0 !== u.size && l(f);
  }
  function d(t, n) {
    t.appendChild(n);
  }
  function p(t) {
    t.parentNode.removeChild(t);
  }
  function g(t) {
    return document.createElement(t);
  }
  function m() {
    return (t = " "), document.createTextNode(t);
    var t;
  }
  function h(t, n, e) {
    null == e
      ? t.removeAttribute(n)
      : t.getAttribute(n) !== e && t.setAttribute(n, e);
  }
  function b(t, n, e, o) {
    t.style.setProperty(n, e, o ? "important" : "");
  }
  const y = new Set();
  let x,
    $ = 0;
  function _(t, n, e, o, i, r, s, a = 0) {
    const c = 16.666 / o;
    let l = "{\n";
    for (let t = 0; t <= 1; t += c) {
      const o = n + (e - n) * r(t);
      l += 100 * t + `%{${s(o, 1 - o)}}\n`;
    }
    const u = l + `100% {${s(e, 1 - e)}}\n}`,
      f = `__svelte_${(function (t) {
        let n = 5381,
          e = t.length;
        for (; e--; ) n = ((n << 5) - n) ^ t.charCodeAt(e);
        return n >>> 0;
      })(u)}_${a}`,
      d = t.ownerDocument;
    y.add(d);
    const p =
        d.__svelte_stylesheet ||
        (d.__svelte_stylesheet = d.head.appendChild(g("style")).sheet),
      m = d.__svelte_rules || (d.__svelte_rules = {});
    m[f] ||
      ((m[f] = !0), p.insertRule(`@keyframes ${f} ${u}`, p.cssRules.length));
    const h = t.style.animation || "";
    return (
      (t.style.animation = `${
        h ? `${h}, ` : ""
      }${f} ${o}ms linear ${i}ms 1 both`),
      ($ += 1),
      f
    );
  }
  function k(t, n) {
    const e = (t.style.animation || "").split(", "),
      o = e.filter(
        n ? (t) => t.indexOf(n) < 0 : (t) => -1 === t.indexOf("__svelte")
      ),
      i = e.length - o.length;
    i &&
      ((t.style.animation = o.join(", ")),
      ($ -= i),
      $ ||
        l(() => {
          $ ||
            (y.forEach((t) => {
              const n = t.__svelte_stylesheet;
              let e = n.cssRules.length;
              for (; e--; ) n.deleteRule(e);
              t.__svelte_rules = {};
            }),
            y.clear());
        }));
  }
  function v(t) {
    x = t;
  }
  const w = [],
    E = [],
    z = [],
    C = [],
    O = Promise.resolve();
  let j = !1;
  function A(t) {
    z.push(t);
  }
  let L = !1;
  const R = new Set();
  function T() {
    if (!L) {
      L = !0;
      do {
        for (let t = 0; t < w.length; t += 1) {
          const n = w[t];
          v(n), S(n.$$);
        }
        for (v(null), w.length = 0; E.length; ) E.pop()();
        for (let t = 0; t < z.length; t += 1) {
          const n = z[t];
          R.has(n) || (R.add(n), n());
        }
        z.length = 0;
      } while (w.length);
      for (; C.length; ) C.pop()();
      (j = !1), (L = !1), R.clear();
    }
  }
  function S(t) {
    if (null !== t.fragment) {
      t.update(), i(t.before_update);
      const n = t.dirty;
      (t.dirty = [-1]),
        t.fragment && t.fragment.p(t.ctx, n),
        t.after_update.forEach(A);
    }
  }
  let P;
  function q(t, n, e) {
    t.dispatchEvent(
      (function (t, n) {
        const e = document.createEvent("CustomEvent");
        return e.initCustomEvent(t, !1, !1, n), e;
      })(`${n ? "intro" : "outro"}${e}`)
    );
  }
  const M = new Set();
  let N;
  const D = { duration: 0 };
  function B(e, o, s, a) {
    let d = o(e, s),
      p = a ? 0 : 1,
      g = null,
      m = null,
      h = null;
    function b() {
      h && k(e, h);
    }
    function y(t, n) {
      const e = t.b - p;
      return (
        (n *= Math.abs(e)),
        {
          a: p,
          b: t.b,
          d: e,
          duration: n,
          start: t.start,
          end: t.start + n,
          group: t.group,
        }
      );
    }
    function x(o) {
      const {
          delay: r = 0,
          duration: s = 300,
          easing: a = n,
          tick: x = t,
          css: $,
        } = d || D,
        k = { start: c() + r, b: o };
      o || ((k.group = N), (N.r += 1)),
        g || m
          ? (m = k)
          : ($ && (b(), (h = _(e, p, o, s, r, a, $))),
            o && x(0, 1),
            (g = y(k, s)),
            A(() => q(e, o, "start")),
            (function (t) {
              let n;
              0 === u.size && l(f),
                new Promise((e) => {
                  u.add((n = { c: t, f: e }));
                });
            })((t) => {
              if (
                (m &&
                  t > m.start &&
                  ((g = y(m, s)),
                  (m = null),
                  q(e, g.b, "start"),
                  $ && (b(), (h = _(e, p, g.b, g.duration, 0, a, d.css)))),
                g)
              )
                if (t >= g.end)
                  x((p = g.b), 1 - p),
                    q(e, g.b, "end"),
                    m || (g.b ? b() : --g.group.r || i(g.group.c)),
                    (g = null);
                else if (t >= g.start) {
                  const n = t - g.start;
                  (p = g.a + g.d * a(n / g.duration)), x(p, 1 - p);
                }
              return !(!g && !m);
            }));
    }
    return {
      run(t) {
        r(d)
          ? (P ||
              ((P = Promise.resolve()),
              P.then(() => {
                P = null;
              })),
            P).then(() => {
              (d = d()), x(t);
            })
          : x(t);
      },
      end() {
        b(), (g = m = null);
      },
    };
  }
  function F(t, n) {
    -1 === t.$$.dirty[0] &&
      (w.push(t), j || ((j = !0), O.then(T)), t.$$.dirty.fill(0)),
      (t.$$.dirty[(n / 31) | 0] |= 1 << n % 31);
  }
  function H(n, s, a, c, l, u, f = [-1]) {
    const d = x;
    v(n);
    const g = (n.$$ = {
      fragment: null,
      ctx: null,
      props: u,
      update: t,
      not_equal: l,
      bound: o(),
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(d ? d.$$.context : s.context || []),
      callbacks: o(),
      dirty: f,
      skip_bound: !1,
    });
    let m = !1;
    if (
      ((g.ctx = a
        ? a(n, s.props || {}, (t, e, ...o) => {
            const i = o.length ? o[0] : e;
            return (
              g.ctx &&
                l(g.ctx[t], (g.ctx[t] = i)) &&
                (!g.skip_bound && g.bound[t] && g.bound[t](i), m && F(n, t)),
              e
            );
          })
        : []),
      g.update(),
      (m = !0),
      i(g.before_update),
      (g.fragment = !!c && c(g.ctx)),
      s.target)
    ) {
      if (s.hydrate) {
        const t = (function (t) {
          return Array.from(t.childNodes);
        })(s.target);
        g.fragment && g.fragment.l(t), t.forEach(p);
      } else g.fragment && g.fragment.c();
      s.intro && (h = n.$$.fragment) && h.i && (M.delete(h), h.i(b)),
        (function (t, n, o, s) {
          const {
            fragment: a,
            on_mount: c,
            on_destroy: l,
            after_update: u,
          } = t.$$;
          a && a.m(n, o),
            s ||
              A(() => {
                const n = c.map(e).filter(r);
                l ? l.push(...n) : i(n), (t.$$.on_mount = []);
              }),
            u.forEach(A);
        })(n, s.target, s.anchor, s.customElement),
        T();
    }
    var h, b;
    v(d);
  }
  function K(t, { delay: e = 0, duration: o = 400, easing: i = n } = {}) {
    const r = +getComputedStyle(t).opacity;
    return {
      delay: e,
      duration: o,
      easing: i,
      css: (t) => "opacity: " + t * r,
    };
  }
  function Y(t) {
    let n, e, o, i, s, a, c, l, u, f, y;
    return {
      c() {
        (n = g("div")),
          (e = g("div")),
          (o = g("div")),
          (o.innerHTML =
            '<img class="aiki-img" src=' +
            browser.runtime.getURL("images/AikiLogo.png") +
            ' alt="Aiki Logo" style="height: 20px;\n      width: 20px;\n      display: inline;\n      margin-right: 5px;\n      background-color: #323f4b !important;"/> \n      <h5 class="aiki-h5" style="font-size: 16px !important;\n      font-weight: bolder !important;\n      font-family: &#39;Roboto&#39;, sans-serif !important;\n      color: #ffffff !important;\n      margin: 0 !important;\n      display: inline !important;\n      background-color: #323f4b !important;">Aiki</h5>'),
          (i = m()),
          (s = g("p")),
          (s.textContent = "You can procrastinate when you're done learning"),
          (a = m()),
          (c = g("button")),
          (c.textContent = "Keep Learning"),
          h(o, "class", "aiki-header"),
          b(o, "display", "flex", 1),
          b(o, "align-items", "center", 1),
          b(o, "justify-content", "center", 1),
          b(o, "width", "100%", 1),
          b(o, "height", "100%", 1),
          b(o, "font-weight", "400", 1),
          b(o, "font-family", "'Roboto', sans-serif", 1),
          b(o, "font-size", "14px", 1),
          b(o, "color", "#ffffff", 1),
          b(o, "background-color", "#323f4b", 1),
          h(s, "class", "aiki-p"),
          b(s, "margin", "5px 0px", 1),
          b(s, "font-weight", "400", 1),
          b(s, "font-family", "'Lato', sans-serif", 1),
          b(s, "font-size", "14px", 1),
          b(s, "color", "#ffffff", 1),
          b(s, "background-color", "#323f4b", 1),
          h(c, "class", "aiki-button svelte-2gjqkm"),
          b(c, "white-space", "normal", 1),
          b(c, "max-width", "90%", 1),
          b(c, "margin", "5px 0px 0px 0px", 1),
          b(c, "display", "flex", 1),
          b(c, "flex-direction", "column", 1),
          b(c, "justify-content", "center", 1),
          b(c, "align-items", "center", 1),
          b(c, "z-index", "9001", 1),
          b(c, "background-color", "#28a745", 1),
          b(c, "border-color", "#28a745", 1),
          b(c, "border", "1px solid transparent", 1),
          b(c, "font-weight", "400", 1),
          b(c, "font-family", "'Roboto', sans-serif", 1),
          b(c, "font-size", "14px", 1),
          b(c, "color", "#ffffff", 1),
          b(c, "text-align", "center", 1),
          b(c, "white-space", "nowrap", 1),
          b(c, "vertical-align", "middle", 1),
          b(c, "-ms-touch-action", "manipulation", 1),
          b(c, "touch-action", "manipulation", 1),
          b(c, "cursor", "pointer", 1),
          b(c, "background-image", "none", 1),
          b(c, "padding", "6px 12px", 1),
          b(c, "font-size", "14px", 1),
          b(c, "line-height", "1.42857143", 1),
          b(c, "border-radius", "4px", 1),
          b(c, "-webkit-user-select", "none", 1),
          b(c, "-moz-user-select", "none", 1),
          b(c, "-ms-user-select", "none", 1),
          b(c, "user-select", "none", 1),
          h(e, "class", "aiki-textbox"),
          b(e, "display", "flex", 1),
          b(e, "justify-content", "center", 1),
          b(e, "align-items", "center", 1),
          b(e, "flex-direction", "column", 1),
          b(e, "color", "#ffffff", 1),
          b(e, "background-color", "#323f4b", 1),
          b(e, "padding", "12px", 1),
          b(e, "border-radius", "10px", 1),
          h(n, "class", "aiki-overlay"),
          b(n, "top", "0", 1),
          b(n, "left", "0", 1),
          b(n, "height", "100%", 1),
          b(n, "width", "100%", 1),
          b(n, "background-color", "#1f2933", 1),
          b(n, "position", "fixed", 1),
          b(n, "z-index", "9001", 1),
          b(n, "display", "flex", 1),
          b(n, "justify-content", "center", 1),
          b(n, "align-items", "center", 1);
      },
      m(l, p) {
        var g, m, h, b;
        !(function (t, n, e) {
          t.insertBefore(n, e || null);
        })(l, n, p),
          d(n, e),
          d(e, o),
          d(e, i),
          d(e, s),
          d(e, a),
          d(e, c),
          (u = !0),
          f ||
            ((m = "click"),
            (h = function () {
              r(t[0]) && t[0].apply(this, arguments);
            }),
            (g = c).addEventListener(m, h, b),
            (y = () => g.removeEventListener(m, h, b)),
            (f = !0));
      },
      p(n, [e]) {
        t = n;
      },
      i(t) {
        u ||
          (A(() => {
            l || (l = B(n, K, { delay: 0, duration: 200 }, !0)), l.run(1);
          }),
          (u = !0));
      },
      o(t) {
        l || (l = B(n, K, { delay: 0, duration: 200 }, !1)), l.run(0), (u = !1);
      },
      d(t) {
        t && p(n), t && l && l.end(), (f = !1), y();
      },
    };
  }
  function G(t, n, e) {
    let { gotoOriginTab: o } = n;
    return (
      (t.$$set = (t) => {
        "gotoOriginTab" in t && e(0, (o = t.gotoOriginTab));
      }),
      [o]
    );
  }
  return new (class extends class {
    $destroy() {
      !(function (t, n) {
        const e = t.$$;
        null !== e.fragment &&
          (i(e.on_destroy),
          e.fragment && e.fragment.d(n),
          (e.on_destroy = e.fragment = null),
          (e.ctx = []));
      })(this, 1),
        (this.$destroy = t);
    }
    $on(t, n) {
      const e = this.$$.callbacks[t] || (this.$$.callbacks[t] = []);
      return (
        e.push(n),
        () => {
          const t = e.indexOf(n);
          -1 !== t && e.splice(t, 1);
        }
      );
    }
    $set(t) {
      var n;
      this.$$set &&
        ((n = t), 0 !== Object.keys(n).length) &&
        ((this.$$.skip_bound = !0), this.$$set(t), (this.$$.skip_bound = !1));
    }
  } {
    constructor(t) {
      super(), H(this, t, G, Y, s, { gotoOriginTab: 0 });
    }
  })({ target: document.body, props: { gotoOriginTab: gotoOriginTab } });
}
//# sourceMappingURL=bundle.js.map
