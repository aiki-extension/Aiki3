export function LearningContent(
  shouldShowWelcome,
  gotoOrigin,
  endInjection,
  browser,
  getReady
) {
  "use strict";
  function t() {}
  const n = (t) => t;
  function e(t, n) {
    for (const e in n) t[e] = n[e];
    return t;
  }
  function r(t) {
    return t();
  }
  function i() {
    return Object.create(null);
  }
  function o(t) {
    t.forEach(r);
  }
  function a(t) {
    return "function" == typeof t;
  }
  function s(t, n) {
    return t != t
      ? n == n
      : t !== n || (t && "object" == typeof t) || "function" == typeof t;
  }
  function u(t) {
    const n = {};
    for (const e in t) "$" !== e[0] && (n[e] = t[e]);
    return n;
  }
  const l = "undefined" != typeof window;
  let c = l ? () => window.performance.now() : () => Date.now(),
    f = l ? (t) => requestAnimationFrame(t) : t;
  const p = new Set();
  function d(t) {
    p.forEach((n) => {
      n.c(t) || (p.delete(n), n.f());
    }),
      0 !== p.size && f(d);
  }
  function h(t, n) {
    t.appendChild(n);
  }
  function g(t, n, e) {
    t.insertBefore(n, e || null);
  }
  function v(t) {
    t.parentNode.removeChild(t);
  }
  function m(t) {
    return document.createElement(t);
  }
  function b(t) {
    return document.createTextNode(t);
  }
  function x() {
    return b(" ");
  }
  function y() {
    return b("");
  }
  function E(t, n, e, r) {
    return t.addEventListener(n, e, r), () => t.removeEventListener(n, e, r);
  }
  function S(t, n, e) {
    null == e
      ? t.removeAttribute(n)
      : t.getAttribute(n) !== e && t.setAttribute(n, e);
  }
  function w(t, n, e, r) {
    t.style.setProperty(n, e, r ? "important" : "");
  }
  function M(t, n) {
    const e = document.createEvent("CustomEvent");
    return e.initCustomEvent(t, !1, !1, n), e;
  }
  const C = new Set();
  let D,
    R = 0;
  function O(t, n, e, r, i, o, a, s = 0) {
    const u = 16.666 / r;
    let l = "{\n";
    for (let t = 0; t <= 1; t += u) {
      const r = n + (e - n) * o(t);
      l += 100 * t + `%{${a(r, 1 - r)}}\n`;
    }
    const c = l + `100% {${a(e, 1 - e)}}\n}`,
      f = `__svelte_${(function (t) {
        let n = 5381,
          e = t.length;
        for (; e--; ) n = ((n << 5) - n) ^ t.charCodeAt(e);
        return n >>> 0;
      })(c)}_${s}`,
      p = t.ownerDocument;
    C.add(p);
    const d =
        p.__svelte_stylesheet ||
        (p.__svelte_stylesheet = p.head.appendChild(m("style")).sheet),
      h = p.__svelte_rules || (p.__svelte_rules = {});
    h[f] ||
      ((h[f] = !0), d.insertRule(`@keyframes ${f} ${c}`, d.cssRules.length));
    const g = t.style.animation || "";
    return (
      (t.style.animation = `${
        g ? `${g}, ` : ""
      }${f} ${r}ms linear ${i}ms 1 both`),
      (R += 1),
      f
    );
  }
  function P(t, n) {
    const e = (t.style.animation || "").split(", "),
      r = e.filter(
        n ? (t) => t.indexOf(n) < 0 : (t) => -1 === t.indexOf("__svelte")
      ),
      i = e.length - r.length;
    i &&
      ((t.style.animation = r.join(", ")),
      (R -= i),
      R ||
        f(() => {
          R ||
            (C.forEach((t) => {
              const n = t.__svelte_stylesheet;
              let e = n.cssRules.length;
              for (; e--; ) n.deleteRule(e);
              t.__svelte_rules = {};
            }),
            C.clear());
        }));
  }
  function z(t) {
    D = t;
  }
  function G() {
    if (!D) throw new Error("Function called outside component initialization");
    return D;
  }
  function B(t) {
    G().$$.on_mount.push(t);
  }
  const T = [],
    _ = [],
    k = [],
    A = [],
    I = Promise.resolve();
  let j = !1;
  function N() {
    j || ((j = !0), I.then(L));
  }
  function F(t) {
    k.push(t);
  }
  function Y(t) {
    A.push(t);
  }
  let X = !1;
  const $ = new Set();
  function L() {
    if (!X) {
      X = !0;
      do {
        for (let t = 0; t < T.length; t += 1) {
          const n = T[t];
          z(n), q(n.$$);
        }
        for (z(null), T.length = 0; _.length; ) _.pop()();
        for (let t = 0; t < k.length; t += 1) {
          const n = k[t];
          $.has(n) || ($.add(n), n());
        }
        k.length = 0;
      } while (T.length);
      for (; A.length; ) A.pop()();
      (j = !1), (X = !1), $.clear();
    }
  }
  function q(t) {
    if (null !== t.fragment) {
      t.update(), o(t.before_update);
      const n = t.dirty;
      (t.dirty = [-1]),
        t.fragment && t.fragment.p(t.ctx, n),
        t.after_update.forEach(F);
    }
  }
  let V;
  function W(t, n, e) {
    t.dispatchEvent(M(`${n ? "intro" : "outro"}${e}`));
  }
  const H = new Set();
  let U;
  function Z() {
    U = { r: 0, c: [], p: U };
  }
  function K() {
    U.r || o(U.c), (U = U.p);
  }
  function J(t, n) {
    t && t.i && (H.delete(t), t.i(n));
  }
  function Q(t, n, e, r) {
    if (t && t.o) {
      if (H.has(t)) return;
      H.add(t),
        U.c.push(() => {
          H.delete(t), r && (e && t.d(1), r());
        }),
        t.o(n);
    }
  }
  const tt = { duration: 0 };
  function nt(e, r, i, s) {
    let u = r(e, i),
      l = s ? 0 : 1,
      h = null,
      g = null,
      v = null;
    function m() {
      v && P(e, v);
    }
    function b(t, n) {
      const e = t.b - l;
      return (
        (n *= Math.abs(e)),
        {
          a: l,
          b: t.b,
          d: e,
          duration: n,
          start: t.start,
          end: t.start + n,
          group: t.group,
        }
      );
    }
    function x(r) {
      const {
          delay: i = 0,
          duration: a = 300,
          easing: s = n,
          tick: x = t,
          css: y,
        } = u || tt,
        E = { start: c() + i, b: r };
      r || ((E.group = U), (U.r += 1)),
        h || g
          ? (g = E)
          : (y && (m(), (v = O(e, l, r, a, i, s, y))),
            r && x(0, 1),
            (h = b(E, a)),
            F(() => W(e, r, "start")),
            (function (t) {
              let n;
              0 === p.size && f(d),
                new Promise((e) => {
                  p.add((n = { c: t, f: e }));
                });
            })((t) => {
              if (
                (g &&
                  t > g.start &&
                  ((h = b(g, a)),
                  (g = null),
                  W(e, h.b, "start"),
                  y && (m(), (v = O(e, l, h.b, h.duration, 0, s, u.css)))),
                h)
              )
                if (t >= h.end)
                  x((l = h.b), 1 - l),
                    W(e, h.b, "end"),
                    g || (h.b ? m() : --h.group.r || o(h.group.c)),
                    (h = null);
                else if (t >= h.start) {
                  const n = t - h.start;
                  (l = h.a + h.d * s(n / h.duration)), x(l, 1 - l);
                }
              return !(!h && !g);
            }));
    }
    return {
      run(t) {
        a(u)
          ? (V ||
              ((V = Promise.resolve()),
              V.then(() => {
                V = null;
              })),
            V).then(() => {
              (u = u()), x(t);
            })
          : x(t);
      },
      end() {
        m(), (h = g = null);
      },
    };
  }
  function et(t, n, e) {
    const r = t.$$.props[n];
    void 0 !== r && ((t.$$.bound[r] = e), e(t.$$.ctx[r]));
  }
  function rt(t) {
    t && t.c();
  }
  function it(t, n, e, i) {
    const { fragment: s, on_mount: u, on_destroy: l, after_update: c } = t.$$;
    s && s.m(n, e),
      i ||
        F(() => {
          const n = u.map(r).filter(a);
          l ? l.push(...n) : o(n), (t.$$.on_mount = []);
        }),
      c.forEach(F);
  }
  function ot(t, n) {
    const e = t.$$;
    null !== e.fragment &&
      (o(e.on_destroy),
      e.fragment && e.fragment.d(n),
      (e.on_destroy = e.fragment = null),
      (e.ctx = []));
  }
  function at(n, e, r, a, s, u, l = [-1]) {
    const c = D;
    z(n);
    const f = (n.$$ = {
      fragment: null,
      ctx: null,
      props: u,
      update: t,
      not_equal: s,
      bound: i(),
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(c ? c.$$.context : e.context || []),
      callbacks: i(),
      dirty: l,
      skip_bound: !1,
    });
    let p = !1;
    if (
      ((f.ctx = r
        ? r(n, e.props || {}, (t, e, ...r) => {
            const i = r.length ? r[0] : e;
            return (
              f.ctx &&
                s(f.ctx[t], (f.ctx[t] = i)) &&
                (!f.skip_bound && f.bound[t] && f.bound[t](i),
                p &&
                  (function (t, n) {
                    -1 === t.$$.dirty[0] &&
                      (T.push(t), N(), t.$$.dirty.fill(0)),
                      (t.$$.dirty[(n / 31) | 0] |= 1 << n % 31);
                  })(n, t)),
              e
            );
          })
        : []),
      f.update(),
      (p = !0),
      o(f.before_update),
      (f.fragment = !!a && a(f.ctx)),
      e.target)
    ) {
      if (e.hydrate) {
        const t = (function (t) {
          return Array.from(t.childNodes);
        })(e.target);
        f.fragment && f.fragment.l(t), t.forEach(v);
      } else f.fragment && f.fragment.c();
      e.intro && J(n.$$.fragment),
        it(n, e.target, e.anchor, e.customElement),
        L();
    }
    z(c);
  }
  class st {
    $destroy() {
      ot(this, 1), (this.$destroy = t);
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
  }
  function ut(t, { delay: e = 0, duration: r = 400, easing: i = n } = {}) {
    const o = +getComputedStyle(t).opacity;
    return {
      delay: e,
      duration: r,
      easing: i,
      css: (t) => "opacity: " + t * o,
    };
  }
  function lt(n) {
    let e, r, i, o, a, s, u, l, c, f;
    return {
      c() {
        (e = m("div")),
          (r = m("div")),
          (i = m("img")),
          (a = x()),
          (s = m("p")),
          (s.textContent = `${n[2]}`),
          S(i, "class", "aiki-img"),
          i.src !== (o = browser.runtime.getURL("images/AikiLogo.png")) &&
            S(i, "src", browser.runtime.getURL("images/AikiLogo.png")),
          S(i, "alt", "Aiki Logo"),
          w(i, "height", "4vh", 1),
          w(i, "padding", "5px", 1),
          w(i, "background-color", "#282c34", 1),
          w(i, "border-radius", "15px 0px 0px 15px", 1),
          w(i, "border", "2px solid #282c34", 1),
          S(s, "class", "aiki-p"),
          w(s, "display", "flex", 1),
          w(s, "align-items", "center", 1),
          w(s, "height", "4vh", 1),
          w(s, "line-height", "4vh", 1),
          w(s, "padding", "5px", 1),
          w(s, "background-color", "#ffffff", 1),
          w(s, "border-radius", "0px 15px 15px 0px", 1),
          w(s, "border-left-style", "none", 1),
          w(s, "border", "2px solid #aaaaaa", 1),
          w(s, "font-size", "16px", 1),
          w(s, "font-family", "'Lato', sans-serif", 1),
          w(s, "text-align", "center", 1),
          w(s, "margin", "0", 1),
          w(s, "color", "#444444", 1),
          S(r, "class", "aiki-wrapper"),
          w(r, "display", "flex", 1),
          w(r, "flex-direction", "row", 1),
          w(r, "width", "fit-content", 1),
          w(r, "position", "fixed", 1),
          w(r, "top", "40%", 1),
          w(r, "left", "calc(50% - 150px)", 1),
          w(r, "justify-items", "center", 1),
          w(r, "align-items", "center", 1),
          w(r, "border-radius", "15px", 1),
          w(r, "box-shadow", "2px 2px 2px rgba(0, 0, 0, 0.3)", 1),
          S(e, "class", "aiki-overlay"),
          w(e, "top", "0", 1),
          w(e, "left", "0", 1),
          w(e, "height", "100%", 1),
          w(e, "width", "100%", 1),
          w(e, "background-color", "rgba(128, 128, 128, 0.3)", 1),
          w(e, "position", "fixed", 1),
          w(e, "z-index", "9001", 1);
      },
      m(t, o) {
        g(t, e, o),
          h(e, r),
          h(r, i),
          h(r, a),
          h(r, s),
          (l = !0),
          c || ((f = E(e, "click", n[3])), (c = !0));
      },
      p: t,
      i(t) {
        l ||
          (F(() => {
            u || (u = nt(e, ut, { delay: 0, duration: 200 }, !0)), u.run(1);
          }),
          (l = !0));
      },
      o(t) {
        u || (u = nt(e, ut, { delay: 0, duration: 200 }, !1)),
          u.run(0),
          (l = !1);
      },
      d(t) {
        t && v(e), t && u && u.end(), (c = !1), f();
      },
    };
  }
  function ct(t) {
    let n,
      e,
      r = t[1] && lt(t);
    return {
      c() {
        r && r.c(), (n = y());
      },
      m(t, i) {
        r && r.m(t, i), g(t, n, i), (e = !0);
      },
      p(t, [e]) {
        t[1]
          ? r
            ? (r.p(t, e), 2 & e && J(r, 1))
            : ((r = lt(t)), r.c(), J(r, 1), r.m(n.parentNode, n))
          : r &&
            (Z(),
            Q(r, 1, 1, () => {
              r = null;
            }),
            K());
      },
      i(t) {
        e || (J(r), (e = !0));
      },
      o(t) {
        Q(r), (e = !1);
      },
      d(t) {
        r && r.d(t), t && v(n);
      },
    };
  }
  function ft(t, n, e) {
    let { welcomeVisible: r } = n,
      i = !0;
    setTimeout(() => e(1, (i = !1)), 2e3);
    const o = [
    ];
    let a = (function () {
      let t = ((n = 0), (e = 6), Math.floor(Math.random() * (e - n)) + n);
      var n, e;
      return o[t];
    })();
    return (
      (t.$$set = (t) => {
        "welcomeVisible" in t && e(0, (r = t.welcomeVisible));
      }),
      [r, i, a, () => e(0, (r = !1))]
    );
  }
  class pt extends st {
    constructor(t) {
      super(), at(this, t, ft, ct, s, { welcomeVisible: 0 });
    }
  }
  function dt(t) {
    for (var n = [], e = 1; e < arguments.length; e++) n[e - 1] = arguments[e];
    return n
      .map(function (n) {
        return n
          .split(" ")
          .map(function (n) {
            return n ? "" + t + n : "";
          })
          .join(" ");
      })
      .join(" ");
  }
  function ht(t, n) {
    return function (e) {
      e && (t[n] = e);
    };
  }
  function gt(t, n, e) {
    return function (r) {
      r && (t[n][e] = r);
    };
  }
  function vt(t, n) {
    return function (e) {
      var r = e.prototype;
      t.forEach(function (t) {
        n(r, t);
      });
    };
  }
  var mt = (function () {
      function t() {
        (this.keys = []), (this.values = []);
      }
      var n = t.prototype;
      return (
        (n.get = function (t) {
          return this.values[this.keys.indexOf(t)];
        }),
        (n.set = function (t, n) {
          var e = this.keys,
            r = this.values,
            i = e.indexOf(t),
            o = -1 === i ? e.length : i;
          (e[o] = t), (r[o] = n);
        }),
        t
      );
    })(),
    bt = (function () {
      function t() {
        this.object = {};
      }
      var n = t.prototype;
      return (
        (n.get = function (t) {
          return this.object[t];
        }),
        (n.set = function (t, n) {
          this.object[t] = n;
        }),
        t
      );
    })(),
    xt = "function" == typeof Map,
    yt = (function () {
      function t() {}
      var n = t.prototype;
      return (
        (n.connect = function (t, n) {
          (this.prev = t),
            (this.next = n),
            t && (t.next = this),
            n && (n.prev = this);
        }),
        (n.disconnect = function () {
          var t = this.prev,
            n = this.next;
          t && (t.next = n), n && (n.prev = t);
        }),
        (n.getIndex = function () {
          for (var t = this, n = -1; t; ) (t = t.prev), ++n;
          return n;
        }),
        t
      );
    })();
  var Et = (function () {
    function t(t, n, e, r, i, o, a, s) {
      (this.prevList = t),
        (this.list = n),
        (this.added = e),
        (this.removed = r),
        (this.changed = i),
        (this.maintained = o),
        (this.changedBeforeAdded = a),
        (this.fixed = s);
    }
    var n = t.prototype;
    return (
      Object.defineProperty(n, "ordered", {
        get: function () {
          return this.cacheOrdered || this.caculateOrdered(), this.cacheOrdered;
        },
        enumerable: !0,
        configurable: !0,
      }),
      Object.defineProperty(n, "pureChanged", {
        get: function () {
          return (
            this.cachePureChanged || this.caculateOrdered(),
            this.cachePureChanged
          );
        },
        enumerable: !0,
        configurable: !0,
      }),
      (n.caculateOrdered = function () {
        var t = (function (t, n) {
            var e = [],
              r = [];
            return (
              t.forEach(function (t) {
                var n = t[0],
                  i = t[1],
                  o = new yt();
                (e[n] = o), (r[i] = o);
              }),
              e.forEach(function (t, n) {
                t.connect(e[n - 1]);
              }),
              t
                .filter(function (t, e) {
                  return !n[e];
                })
                .map(function (t, n) {
                  var i = t[0],
                    o = t[1];
                  if (i === o) return [0, 0];
                  var a = e[i],
                    s = r[o - 1],
                    u = a.getIndex();
                  return (
                    a.disconnect(),
                    s ? a.connect(s, s.next) : a.connect(void 0, e[0]),
                    [u, a.getIndex()]
                  );
                })
            );
          })(this.changedBeforeAdded, this.fixed),
          n = this.changed,
          e = [];
        (this.cacheOrdered = t.filter(function (t, r) {
          var i = t[0],
            o = t[1],
            a = n[r],
            s = a[0],
            u = a[1];
          if (i !== o) return e.push([s, u]), !0;
        })),
          (this.cachePureChanged = e);
      }),
      t
    );
  })();
  function St(t, n, e) {
    var r = xt ? Map : e ? bt : mt,
      i =
        e ||
        function (t) {
          return t;
        },
      o = [],
      a = [],
      s = [],
      u = t.map(i),
      l = n.map(i),
      c = new r(),
      f = new r(),
      p = [],
      d = [],
      h = {},
      g = [],
      v = 0,
      m = 0;
    return (
      u.forEach(function (t, n) {
        c.set(t, n);
      }),
      l.forEach(function (t, n) {
        f.set(t, n);
      }),
      u.forEach(function (t, n) {
        var e = f.get(t);
        void 0 === e ? (++m, a.push(n)) : (h[e] = m);
      }),
      l.forEach(function (t, n) {
        var e = c.get(t);
        void 0 === e
          ? (o.push(n), ++v)
          : (s.push([e, n]),
            (m = h[n] || 0),
            p.push([e - m, n - v]),
            d.push(n === e),
            e !== n && g.push([e, n]));
      }),
      a.reverse(),
      new Et(t, n, o, a, g, s, p, d)
    );
  }
  var wt = (function () {
      function t(t, n) {
        void 0 === t && (t = []),
          (this.findKeyCallback = n),
          (this.list = [].slice.call(t));
      }
      return (
        (t.prototype.update = function (t) {
          var n = [].slice.call(t),
            e = St(this.list, n, this.findKeyCallback);
          return (this.list = n), e;
        }),
        t
      );
    })(),
    Mt = ['"', "'", '\\"', "\\'"],
    Ct = 1e-7,
    Dt = {
      cm: function (t) {
        return (96 * t) / 2.54;
      },
      mm: function (t) {
        return (96 * t) / 254;
      },
      in: function (t) {
        return 96 * t;
      },
      pt: function (t) {
        return (96 * t) / 72;
      },
      pc: function (t) {
        return (96 * t) / 6;
      },
      "%": function (t, n) {
        return (t * n) / 100;
      },
      vw: function (t, n) {
        return void 0 === n && (n = window.innerWidth), (t / 100) * n;
      },
      vh: function (t, n) {
        return void 0 === n && (n = window.innerHeight), (t / 100) * n;
      },
      vmax: function (t, n) {
        return (
          void 0 === n && (n = Math.max(window.innerWidth, window.innerHeight)),
          (t / 100) * n
        );
      },
      vmin: function (t, n) {
        return (
          void 0 === n && (n = Math.min(window.innerWidth, window.innerHeight)),
          (t / 100) * n
        );
      },
    };
  function Rt(t) {
    return void 0 === t;
  }
  function Ot(t) {
    return t && "object" == typeof t;
  }
  function Pt(t) {
    return Array.isArray(t);
  }
  function zt(t) {
    return "string" == typeof t;
  }
  function Gt(t) {
    return "function" == typeof t;
  }
  function Bt(t, n, e, r) {
    for (var i = e; i < r; ++i) {
      var o = n[i].trim();
      if (o === t) return i;
      var a = i;
      if (
        ("(" === o
          ? (a = Bt(")", n, i + 1, r))
          : Mt.indexOf(o) > -1 && (a = Bt(o, n, i + 1, r)),
        -1 === a)
      )
        break;
      i = a;
    }
    return -1;
  }
  function Tt(t, n) {
    for (
      var e = new RegExp(
          "(\\s*" + (n || ",") + "\\s*|\\(|\\)|\"|'|\\\\\"|\\\\'|\\s+)",
          "g"
        ),
        r = t.split(e).filter(Boolean),
        i = r.length,
        o = [],
        a = [],
        s = 0;
      s < i;
      ++s
    ) {
      var u = r[s].trim(),
        l = s;
      if ("(" === u) l = Bt(")", r, s + 1, i);
      else {
        if (")" === u) throw new Error("invalid format");
        if (Mt.indexOf(u) > -1) l = Bt(u, r, s + 1, i);
        else if (u === n) {
          a.length && (o.push(a.join("")), (a = []));
          continue;
        }
      }
      -1 === l && (l = i - 1), a.push(r.slice(s, l + 1).join("")), (s = l);
    }
    return a.length && o.push(a.join("")), o;
  }
  function _t(t) {
    return Tt(t, "");
  }
  function kt(t) {
    return Tt(t, ",");
  }
  function At(t) {
    var n = /([^(]*)\(([\s\S]*)\)([\s\S]*)/g.exec(t);
    return !n || n.length < 4
      ? {}
      : { prefix: n[1], value: n[2], suffix: n[3] };
  }
  function It(t) {
    var n = /^([^\d|e|\-|\+]*)((?:\d|\.|-|e-|e\+)+)(\S*)$/g.exec(t);
    if (!n) return { prefix: "", unit: "", value: NaN };
    var e = n[1],
      r = n[2];
    return { prefix: e, unit: n[3], value: parseFloat(r) };
  }
  function jt(t) {
    return t.replace(/[\s-_]([a-z])/g, function (t, n) {
      return n.toUpperCase();
    });
  }
  function Nt(t, n) {
    return (
      void 0 === n && (n = "-"),
      t.replace(/([a-z])([A-Z])/g, function (t, e, r) {
        return "" + e + n + r.toLowerCase();
      })
    );
  }
  function Ft() {
    return Date.now ? Date.now() : new Date().getTime();
  }
  function Yt(t, n, e) {
    void 0 === e && (e = -1);
    for (var r = t.length, i = 0; i < r; ++i) if (n(t[i], i, t)) return i;
    return e;
  }
  function Xt(t) {
    if (Object.keys) return Object.keys(t);
    var n = [];
    for (var e in n) n.push(e);
    return n;
  }
  function $t(t, n) {
    var e = It(t),
      r = e.value,
      i = e.unit;
    if (Ot(n)) {
      var o = n[i];
      if (o) {
        if (Gt(o)) return o(r);
        if (Dt[i]) return Dt[i](r, o);
      }
    } else if ("%" === i) return (r * n) / 100;
    return Dt[i] ? Dt[i](r) : r;
  }
  function Lt(t, n) {
    return n ? Math.round(t / n) * n : t;
  }
  function qt(t, n, e) {
    return (
      [
        [Lt(n[0], Ct), Lt((n[0] * t[1]) / t[0], Ct)],
        [Lt((n[1] * t[0]) / t[1], Ct), Lt(n[1], Ct)],
      ].filter(function (t) {
        return t.every(function (t, r) {
          return e ? t <= n[r] : t >= n[r];
        });
      })[0] || t
    );
  }
  function Vt(t, n, e, r) {
    if (!r)
      return t.map(function (t, r) {
        return (function (t, n, e) {
          return Math.max(n, Math.min(t, e));
        })(t, n[r], e[r]);
      });
    var i = t[0],
      o = t[1],
      a = qt(t, n, !1),
      s = a[0],
      u = a[1],
      l = qt(t, e, !0),
      c = l[0],
      f = l[1];
    return (
      i < s || o < u
        ? ((i = s), (o = u))
        : (i > c || o > f) && ((i = c), (o = f)),
      [i, o]
    );
  }
  function Wt(t) {
    for (var n = t.length, e = 0, r = n - 1; r >= 0; --r) e += t[r];
    return n ? e / n : 0;
  }
  function Ht(t, n) {
    var e = n[0] - t[0],
      r = n[1] - t[1],
      i = Math.atan2(r, e);
    return i >= 0 ? i : i + 2 * Math.PI;
  }
  function Ut(t) {
    var n = (function (t) {
        return [0, 1].map(function (n) {
          return Wt(
            t.map(function (t) {
              return t[n];
            })
          );
        });
      })(t),
      e = Ht(n, t[0]),
      r = Ht(n, t[1]);
    return (e < r && r - e < Math.PI) || (e > r && r - e < -Math.PI) ? 1 : -1;
  }
  function Zt(t, n) {
    return Math.sqrt(
      Math.pow((n ? n[0] : 0) - t[0], 2) + Math.pow((n ? n[1] : 0) - t[1], 2)
    );
  }
  function Kt(t, n) {
    return t.classList
      ? t.classList.contains(n)
      : !!t.className.match(new RegExp("(\\s|^)" + n + "(\\s|$)"));
  }
  function Jt(t, n, e, r) {
    t.addEventListener(n, e, r);
  }
  function Qt(t, n, e) {
    t.removeEventListener(n, e);
  }
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT.  See the Apache Version 2.0 License for specific language governing permissions and limitations under the License. ***************************************************************************** */ var tn =
    function (t, n) {
      return (tn =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  function nn(t, n) {
    function e() {
      this.constructor = t;
    }
    tn(t, n),
      (t.prototype =
        null === n ? Object.create(n) : ((e.prototype = n.prototype), new e()));
  }
  var en = function () {
    return (en =
      Object.assign ||
      function (t) {
        for (var n, e = 1, r = arguments.length; e < r; e++)
          for (var i in (n = arguments[e]))
            Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
        return t;
      }).apply(this, arguments);
  };
  function rn(t, n) {
    var e = {};
    for (var r in t)
      Object.prototype.hasOwnProperty.call(t, r) &&
        n.indexOf(r) < 0 &&
        (e[r] = t[r]);
    if (null != t && "function" == typeof Object.getOwnPropertySymbols) {
      var i = 0;
      for (r = Object.getOwnPropertySymbols(t); i < r.length; i++)
        n.indexOf(r[i]) < 0 &&
          Object.prototype.propertyIsEnumerable.call(t, r[i]) &&
          (e[r[i]] = t[r[i]]);
    }
    return e;
  }
  function on(t, n) {
    if (t === n) return !1;
    for (var e in t) if (!(e in n)) return !0;
    for (var e in n) if (t[e] !== n[e]) return !0;
    return !1;
  }
  function an(t, n) {
    var e = Object.keys(t),
      r = Object.keys(n),
      i = St(e, r, function (t) {
        return t;
      }),
      o = {},
      a = {},
      s = {};
    return (
      i.added.forEach(function (t) {
        var e = r[t];
        o[e] = n[e];
      }),
      i.removed.forEach(function (n) {
        var r = e[n];
        a[r] = t[r];
      }),
      i.maintained.forEach(function (r) {
        var i = r[0],
          o = e[i],
          a = [t[o], n[o]];
        t[o] !== n[o] && (s[o] = a);
      }),
      { added: o, removed: a, changed: s }
    );
  }
  function sn(t) {
    t.forEach(function (t) {
      t();
    });
  }
  function un(t) {
    var n = 0;
    return t.map(function (t) {
      return null == t ? "$compat" + ++n : "" + t;
    });
  }
  function ln(t, n, e, r) {
    return zt(t) || "number" == typeof t
      ? new vn("text_" + t, n, e, r, null, {})
      : new ("string" == typeof t.type
          ? mn
          : t.type.prototype.render
          ? Sn
          : yn)(t.type, n, e, r, t.ref, t.props);
  }
  function cn(t) {
    var n = [];
    return (
      t.forEach(function (t) {
        n = n.concat(Pt(t) ? cn(t) : t);
      }),
      n
    );
  }
  function fn(t) {
    var n = t.className,
      e = rn(t, ["className"]);
    return null != n && (e.class = n), delete e.style, delete e.children, e;
  }
  function pn(t, n) {
    if (!n) return t;
    for (var e in n) Rt(t[e]) && (t[e] = n[e]);
    return t;
  }
  function dn(t, n) {
    for (var e = [], r = 2; r < arguments.length; r++) e[r - 2] = arguments[r];
    var i = n || {},
      o = i.key,
      a = i.ref,
      s = rn(i, ["key", "ref"]);
    return {
      type: t,
      key: o,
      ref: a,
      props: en(en({}, s), {
        children: cn(e).filter(function (t) {
          return null != t && !1 !== t;
        }),
      }),
    };
  }
  var hn = (function () {
    function t(t, n, e, r, i, o) {
      void 0 === o && (o = {}),
        (this.type = t),
        (this.key = n),
        (this.index = e),
        (this.container = r),
        (this.ref = i),
        (this.props = o),
        (this._providers = []);
    }
    var n = t.prototype;
    return (
      (n._should = function (t, n) {
        return !0;
      }),
      (n._update = function (t, n, e, r) {
        if (this.base && !zt(n) && !r && !this._should(n.props, e)) return !1;
        (this.original = n), this._setState(e);
        var i = this.props;
        return (
          zt(n) || ((this.props = n.props), (this.ref = n.ref)),
          this._render(t, this.base ? i : {}, e),
          !0
        );
      }),
      (n._mounted = function () {
        var t = this.ref;
        t && t(this.base);
      }),
      (n._setState = function (t) {}),
      (n._updated = function () {
        var t = this.ref;
        t && t(this.base);
      }),
      (n._destroy = function () {
        var t = this.ref;
        t && t(null);
      }),
      t
    );
  })();
  function gn(t) {
    var n = {},
      e = {};
    for (var r in t)
      0 === r.indexOf("on")
        ? (e[r.replace("on", "").toLowerCase()] = t[r])
        : (n[r] = t[r]);
    return { attributes: n, events: e };
  }
  var vn = (function (t) {
      function n() {
        return (null !== t && t.apply(this, arguments)) || this;
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e._render = function (t) {
          var n = this,
            e = !this.base;
          return (
            e &&
              (this.base = document.createTextNode(
                this.type.replace("text_", "")
              )),
            t.push(function () {
              e ? n._mounted() : n._updated();
            }),
            !0
          );
        }),
        (e._unmount = function () {
          this.base.parentNode.removeChild(this.base);
        }),
        n
      );
    })(hn),
    mn = (function (t) {
      function n() {
        var n = (null !== t && t.apply(this, arguments)) || this;
        return (n.events = {}), n;
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e.addEventListener = function (t, n) {
          var e = this.events;
          (e[t] = function (t) {
            (t.nativeEvent = t), n(t);
          }),
            this.base.addEventListener(t, e[t]);
        }),
        (e.removeEventListener = function (t) {
          var n = this.events;
          this.base.removeEventListener(t, n[t]), delete n[t];
        }),
        (e._should = function (t) {
          return on(this.props, t);
        }),
        (e._render = function (t, n) {
          var e = this,
            r = !this.base;
          r &&
            (this.base =
              this.props.portalContainer || document.createElement(this.type)),
            Rn(this, this._providers, this.props.children, t, null);
          var i = this.base,
            o = gn(n),
            a = o.attributes,
            s = o.events,
            u = gn(this.props),
            l = u.attributes,
            c = u.events;
          return (
            (function (t, n, e) {
              var r = an(t, n),
                i = r.added,
                o = r.removed,
                a = r.changed;
              for (var s in i) e.setAttribute(s, i[s]);
              for (var s in a) e.setAttribute(s, a[s][1]);
              for (var s in o) e.removeAttribute(s);
            })(fn(a), fn(l), i),
            (function (t, n, e) {
              var r = an(t, n),
                i = r.added,
                o = r.removed,
                a = r.changed;
              for (var s in o) e.removeEventListener(s);
              for (var s in i) e.addEventListener(s, i[s]);
              for (var s in a)
                e.removeEventListener(s), e.addEventListener(s, a[s][1]);
              for (var s in o) e.removeEventListener(s);
            })(s, c, this),
            (function (t, n, e) {
              var r = e.style,
                i = an(t, n),
                o = i.added,
                a = i.removed,
                s = i.changed;
              for (var u in o) {
                var l = Nt(u, "-");
                r.setProperty ? r.setProperty(l, o[u]) : (r[l] = o[u]);
              }
              for (var u in s)
                (l = Nt(u, "-")),
                  r.setProperty ? r.setProperty(l, s[u][1]) : (r[l] = s[u][1]);
              for (var u in a)
                (l = Nt(u, "-")),
                  r.removeProperty ? r.removeProperty(l) : (r[l] = "");
            })(n.style || {}, this.props.style || {}, i),
            t.push(function () {
              r ? e._mounted() : e._updated();
            }),
            !0
          );
        }),
        (e._unmount = function () {
          var t = this.events,
            n = this.base;
          for (var e in t) n.removeEventListener(e, t[e]);
          this._providers.forEach(function (t) {
            t._unmount();
          }),
            (this.events = {}),
            this.props.portalContainer || n.parentNode.removeChild(n);
        }),
        n
      );
    })(hn);
  function bn(t) {
    if (!t) return null;
    var n = t.base;
    return n instanceof Node ? n : bn(t.container);
  }
  function xn(t) {
    if (!t) return null;
    if (t instanceof Node) return t;
    var n = t._provider._providers;
    return n.length ? xn(n[0].base) : null;
  }
  var yn = (function (t) {
      function n() {
        return (null !== t && t.apply(this, arguments)) || this;
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e._render = function (t) {
          var n = this.type(this.props);
          return Rn(this, this._providers, n ? [n] : [], t), !0;
        }),
        (e._unmount = function () {
          this._providers.forEach(function (t) {
            t._unmount();
          });
        }),
        n
      );
    })(hn),
    En = (function (t) {
      function n(n) {
        var e = t.call(this, "container", "container", 0, null) || this;
        return (e.base = n), e;
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e._render = function () {
          return !0;
        }),
        (e._unmount = function () {}),
        n
      );
    })(hn),
    Sn = (function (t) {
      function n(n, e, r, i, o, a) {
        return (
          void 0 === a && (a = {}),
          t.call(this, n, e, r, i, o, pn(a, n.defaultProps)) || this
        );
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e._should = function (t, n) {
          return this.base.shouldComponentUpdate(
            pn(t, this.type.defaultProps),
            n || this.base.state
          );
        }),
        (e._render = function (t, n, e) {
          var r = this;
          this.props = pn(this.props, this.type.defaultProps);
          var i = !this.base;
          i
            ? ((this.base = new this.type(this.props)),
              (this.base._provider = this))
            : (this.base.props = this.props);
          var o = this.base,
            a = o.state,
            s = o.render();
          s &&
            s.props &&
            !s.props.children.length &&
            (s.props.children = this.props.children),
            Rn(this, this._providers, s ? [s] : [], t, e, null),
            t.push(function () {
              i
                ? (r._mounted(), o.componentDidMount())
                : (r._updated(), o.componentDidUpdate(n, a));
            });
        }),
        (e._setState = function (t) {
          t && (this.base.state = t);
        }),
        (e._unmount = function () {
          this._providers.forEach(function (t) {
            t._unmount();
          }),
            this.base.componentWillUnmount();
        }),
        n
      );
    })(hn),
    wn = (function () {
      function t(t) {
        void 0 === t && (t = {}), (this.props = t), (this.state = {});
      }
      var n = t.prototype;
      return (
        (n.shouldComponentUpdate = function (t, n) {
          return !0;
        }),
        (n.render = function () {
          return null;
        }),
        (n.setState = function (t, n, e) {
          var r = [],
            i = this._provider;
          Rn(i.container, [i], [i.original], r, en(en({}, this.state), t), e) &&
            (n && r.push(n), sn(r));
        }),
        (n.forceUpdate = function (t) {
          this.setState(this.state, t, !0);
        }),
        (n.componentDidMount = function () {}),
        (n.componentDidUpdate = function (t, n) {}),
        (n.componentWillUnmount = function () {}),
        t
      );
    })(),
    Mn = (function (t) {
      function n() {
        return (null !== t && t.apply(this, arguments)) || this;
      }
      return (
        nn(n, t),
        (n.prototype.shouldComponentUpdate = function (t, n) {
          return on(this.props, t) || on(this.state, n);
        }),
        n
      );
    })(wn),
    Cn = (function (t) {
      function n() {
        return (null !== t && t.apply(this, arguments)) || this;
      }
      nn(n, t);
      var e = n.prototype;
      return (
        (e.componentDidMount = function () {
          var t = this.props,
            n = t.element,
            e = t.container;
          (this._portalProvider = new En(e)), On(n, e, this._portalProvider);
        }),
        (e.componentDidUpdate = function () {
          var t = this.props;
          On(t.element, t.container, this._portalProvider);
        }),
        (e.componentWillUnmount = function () {
          On(null, this.props.container, this._portalProvider),
            (this._portalProvider = null);
        }),
        n
      );
    })(Mn);
  function Dn(t, n, e) {
    var r = e.map(function (t) {
        return zt(t) ? null : t.key;
      }),
      i = St(
        un(
          n.map(function (t) {
            return t.key;
          })
        ),
        un(r),
        function (t) {
          return t;
        }
      );
    i.removed.forEach(function (t) {
      n.splice(t, 1)[0]._unmount();
    }),
      i.ordered.forEach(function (t) {
        var e = t[0],
          r = t[1],
          i = n.splice(e, 1)[0];
        n.splice(r, 0, i);
        var o = xn(i.base),
          a = xn(n[r + 1] && n[r + 1].base);
        o && o.parentNode.insertBefore(o, a);
      }),
      i.added.forEach(function (i) {
        n.splice(i, 0, ln(e[i], r[i], i, t));
      });
    var o = i.maintained.filter(function (i) {
      i[0];
      var o = i[1],
        a = e[o],
        s = n[o];
      return (zt(a) ? "text_" + a : a.type) !== s.type
        ? (s._unmount(), n.splice(o, 1, ln(a, r[o], o, t)), !0)
        : ((s.index = o), !1);
    });
    return (function () {
      for (var t = 0, n = 0, e = arguments.length; n < e; n++)
        t += arguments[n].length;
      var r = Array(t),
        i = 0;
      for (n = 0; n < e; n++)
        for (var o = arguments[n], a = 0, s = o.length; a < s; a++, i++)
          r[i] = o[a];
      return r;
    })(
      i.added,
      o.map(function (t) {
        return t[0], t[1];
      })
    );
  }
  function Rn(t, n, e, r, i, o) {
    var a = Dn(t, n, e),
      s = n.filter(function (t, n) {
        return t._update(r, e[n], i, o);
      }),
      u = bn(t);
    return (
      u &&
        a.reverse().forEach(function (e) {
          var r = n[e],
            i = xn(r.base);
          if (i && u !== i && !i.parentNode) {
            var o = (function (t, n) {
              for (
                var e = t._providers, r = e.length, i = n.index + 1;
                i < r;
                ++i
              ) {
                var o = xn(e[i].base);
                if (o) return o;
              }
              return null;
            })(t, r);
            u.insertBefore(i, o);
          }
        }),
      s.length > 0
    );
  }
  function On(t, n, e) {
    void 0 === e && (e = n.__REACT_COMPAT__);
    var r = !!e;
    return (
      e || (e = new En(n)),
      (function (t, n, e) {
        var r = [];
        Rn(t, t._providers, n, r, e), sn(r);
      })(e, t ? [t] : []),
      r || (n.__REACT_COMPAT__ = e),
      e
    );
  }
  function Pn(t, n, e) {
    var r = n.__REACT_COMPAT__;
    t && !r && (n.innerHTML = ""), On(t, n, r), e && e();
  }
  function zn(t, n) {
    for (var e = t.length, r = 0; r < e; ++r) if (n(t[r], r)) return !0;
    return !1;
  }
  function Gn(t, n) {
    for (var e = t.length, r = 0; r < e; ++r) if (n(t[r], r)) return t[r];
    return null;
  }
  function Bn(t, n) {
    try {
      return new RegExp(t, "g").exec(n);
    } catch (t) {
      return null;
    }
  }
  function Tn(t) {
    return t.replace(/_/g, ".");
  }
  function _n(t, n) {
    var e = null,
      r = "-1";
    return (
      zn(t, function (t) {
        var i = Bn("(" + t.test + ")((?:\\/|\\s|:)([0-9|\\.|_]+))?", n);
        return (
          !(!i || t.brand) &&
          ((e = t),
          (r = i[3] || "-1"),
          t.versionAlias
            ? (r = t.versionAlias)
            : t.versionTest &&
              (r =
                (function (t, n) {
                  var e = Bn("(" + t + ")((?:\\/|\\s|:)([0-9|\\.|_]+))", n);
                  return e ? e[3] : "";
                })(t.versionTest.toLowerCase(), n) || r),
          (r = Tn(r)),
          !0)
        );
      }),
      { preset: e, version: r }
    );
  }
  function kn(t, n) {
    var e = { brand: "", version: "-1" };
    return (
      zn(t, function (t) {
        var r = An(n, t);
        return (
          !!r &&
          ((e.brand = t.id),
          (e.version = t.versionAlias || r.version),
          "-1" !== e.version)
        );
      }),
      e
    );
  }
  function An(t, n) {
    return Gn(t, function (t) {
      var e = t.brand;
      return Bn("" + n.test, e.toLowerCase());
    });
  }
  var In = [
      { test: "phantomjs", id: "phantomjs" },
      { test: "whale", id: "whale" },
      { test: "edgios|edge|edg", id: "edge" },
      {
        test: "msie|trident|windows phone",
        id: "ie",
        versionTest: "iemobile|msie|rv",
      },
      { test: "miuibrowser", id: "miui browser" },
      { test: "samsungbrowser", id: "samsung internet" },
      { test: "samsung", id: "samsung internet", versionTest: "version" },
      { test: "chrome|crios", id: "chrome" },
      { test: "firefox|fxios", id: "firefox" },
      { test: "android", id: "android browser", versionTest: "version" },
      { test: "safari|iphone|ipad|ipod", id: "safari", versionTest: "version" },
    ],
    jn = [
      {
        test: "(?=.*applewebkit/(53[0-7]|5[0-2]|[0-4]))(?=.*\\schrome)",
        id: "chrome",
        versionTest: "chrome",
      },
      { test: "chromium", id: "chrome" },
      { test: "whale", id: "chrome", versionAlias: "-1", brand: !0 },
    ],
    Nn = [
      { test: "applewebkit", id: "webkit", versionTest: "applewebkit|safari" },
    ],
    Fn = [
      { test: "(?=(iphone|ipad))(?!(.*version))", id: "webview" },
      {
        test: "(?=(android|iphone|ipad))(?=.*(naver|daum|; wv))",
        id: "webview",
      },
      { test: "webview", id: "webview" },
    ],
    Yn = [
      { test: "windows phone", id: "windows phone" },
      { test: "windows 2000", id: "window", versionAlias: "5.0" },
      { test: "windows nt", id: "window" },
      { test: "iphone|ipad|ipod", id: "ios", versionTest: "iphone os|cpu os" },
      { test: "mac os x", id: "mac" },
      { test: "android", id: "android" },
      { test: "tizen", id: "tizen" },
      { test: "webos|web0s", id: "webos" },
    ];
  function Xn(t) {
    var n = (function (t) {
        var n = t;
        if (void 0 === n) {
          if ("undefined" == typeof navigator || !navigator) return "";
          n = navigator.userAgent || "";
        }
        return n.toLowerCase();
      })(t),
      e = !!/mobi/g.exec(n),
      r = {
        name: "unknown",
        version: "-1",
        majorVersion: -1,
        webview: !!_n(Fn, n).preset,
        chromium: !1,
        chromiumVersion: "-1",
        webkit: !1,
        webkitVersion: "-1",
      },
      i = { name: "unknown", version: "-1", majorVersion: -1 },
      o = _n(In, n),
      a = o.preset,
      s = o.version,
      u = _n(Yn, n),
      l = u.preset,
      c = u.version,
      f = _n(jn, n);
    if (
      ((r.chromium = !!f.preset), (r.chromiumVersion = f.version), !r.chromium)
    ) {
      var p = _n(Nn, n);
      (r.webkit = !!p.preset), (r.webkitVersion = p.version);
    }
    return (
      l &&
        ((i.name = l.id), (i.version = c), (i.majorVersion = parseInt(c, 10))),
      a &&
        ((r.name = a.id),
        (r.version = s),
        r.webview &&
          "ios" === i.name &&
          "safari" !== r.name &&
          (r.webview = !1)),
      (r.majorVersion = parseInt(r.version, 10)),
      { browser: r, os: i, isMobile: e, isHints: !1 }
    );
  }
  function $n(t, n, e, r, i, o) {
    for (var a = 0; a < i; ++a) {
      var s = e + a * i,
        u = r + a * i;
      (t[s] += t[u] * o), (n[s] += n[u] * o);
    }
  }
  function Ln(t, n, e, r, i) {
    for (var o = 0; o < i; ++o) {
      var a = e + o * i,
        s = r + o * i,
        u = t[a],
        l = n[a];
      (t[a] = t[s]), (t[s] = u), (n[a] = n[s]), (n[s] = l);
    }
  }
  function qn(t, n, e, r, i) {
    for (var o = 0; o < r; ++o) {
      var a = e + o * r;
      (t[a] /= i), (n[a] /= i);
    }
  }
  function Vn(t, n, e) {
    void 0 === e && (e = Math.sqrt(t.length));
    for (var r = t.slice(), i = 0; i < e; ++i)
      (r[i * e + n - 1] = 0), (r[(n - 1) * e + i] = 0);
    return (r[(n - 1) * (e + 1)] = 1), r;
  }
  function Wn(t, n) {
    void 0 === n && (n = Math.sqrt(t.length));
    for (var e = t.slice(), r = ce(n), i = 0; i < n; ++i) {
      var o = n * i + i;
      if (!Lt(e[o], Ct))
        for (var a = i + 1; a < n; ++a)
          if (e[n * i + a]) {
            Ln(e, r, i, a, n);
            break;
          }
      if (!Lt(e[o], Ct)) return [];
      qn(e, r, i, n, e[o]);
      for (a = 0; a < n; ++a) {
        var s = a,
          u = e[a + i * n];
        Lt(u, Ct) && i !== a && $n(e, r, s, i, n, -u);
      }
    }
    return r;
  }
  function Hn(t, n) {
    for (var e = t.slice(), r = t.length; r < n - 1; ++r) e[r] = 0;
    return (e[n - 1] = 1), e;
  }
  function Un(t, n, e) {
    if ((void 0 === n && (n = Math.sqrt(t.length)), n === e)) return t;
    for (var r = ce(e), i = Math.min(n, e), o = 0; o < i - 1; ++o) {
      for (var a = 0; a < i - 1; ++a) r[o * e + a] = t[o * n + a];
      (r[(o + 1) * e - 1] = t[(o + 1) * n - 1]),
        (r[(e - 1) * e + o] = t[(n - 1) * n + o]);
    }
    return (r[e * e - 1] = t[n * n - 1]), r;
  }
  function Zn(t) {
    for (var n = [], e = 1; e < arguments.length; e++) n[e - 1] = arguments[e];
    var r = ce(t);
    return (
      n.forEach(function (n) {
        r = Kn(r, n, t);
      }),
      r
    );
  }
  function Kn(t, n, e) {
    void 0 === e && (e = Math.sqrt(t.length));
    var r = [],
      i = t.length / e,
      o = n.length / i;
    if (!i) return n;
    if (!o) return t;
    for (var a = 0; a < e; ++a)
      for (var s = 0; s < o; ++s) {
        r[s * e + a] = 0;
        for (var u = 0; u < i; ++u) r[s * e + a] += t[u * e + a] * n[s * i + u];
      }
    return r;
  }
  function Jn(t, n) {
    for (var e = Math.min(t.length, n.length), r = t.slice(), i = 0; i < e; ++i)
      r[i] = r[i] + n[i];
    return r;
  }
  function Qn(t, n) {
    for (var e = Math.min(t.length, n.length), r = t.slice(), i = 0; i < e; ++i)
      r[i] = r[i] - n[i];
    return r;
  }
  function te(t, n) {
    return (
      void 0 === n && (n = 9 === t.length),
      n ? [t[0], t[1], t[3], t[4], t[6], t[7]] : t
    );
  }
  function ne(t, n, e) {
    void 0 === e && (e = n.length);
    var r = Kn(t, n, e),
      i = r[e - 1];
    return r.map(function (t) {
      return t / i;
    });
  }
  function ee(t, n) {
    return Kn(
      t,
      [
        1,
        0,
        0,
        0,
        0,
        Math.cos(n),
        Math.sin(n),
        0,
        0,
        -Math.sin(n),
        Math.cos(n),
        0,
        0,
        0,
        0,
        1,
      ],
      4
    );
  }
  function re(t, n) {
    return Kn(
      t,
      [
        Math.cos(n),
        0,
        -Math.sin(n),
        0,
        0,
        1,
        0,
        0,
        Math.sin(n),
        0,
        Math.cos(n),
        0,
        0,
        0,
        0,
        1,
      ],
      4
    );
  }
  function ie(t, n) {
    return Kn(t, le(n, 4));
  }
  function oe(t, n) {
    var e = n[0],
      r = void 0 === e ? 1 : e,
      i = n[1],
      o = void 0 === i ? 1 : i,
      a = n[2];
    return Kn(
      t,
      [r, 0, 0, 0, 0, o, 0, 0, 0, 0, void 0 === a ? 1 : a, 0, 0, 0, 0, 1],
      4
    );
  }
  function ae(t, n) {
    return ne(le(n, 3), Hn(t, 3));
  }
  function se(t, n) {
    var e = n[0],
      r = void 0 === e ? 0 : e,
      i = n[1],
      o = void 0 === i ? 0 : i,
      a = n[2];
    return Kn(
      t,
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, r, o, void 0 === a ? 0 : a, 1],
      4
    );
  }
  function ue(t, n) {
    return Kn(t, n, 4);
  }
  function le(t, n) {
    var e = Math.cos(t),
      r = Math.sin(t),
      i = ce(n);
    return (i[0] = e), (i[1] = r), (i[n] = -r), (i[n + 1] = e), i;
  }
  function ce(t) {
    for (var n = t * t, e = [], r = 0; r < n; ++r) e[r] = r % (t + 1) ? 0 : 1;
    return e;
  }
  function fe(t, n) {
    for (var e = ce(n), r = Math.min(t.length, n - 1), i = 0; i < r; ++i)
      e[(n + 1) * i] = t[i];
    return e;
  }
  function pe(t, n) {
    for (var e = ce(n), r = Math.min(t.length, n - 1), i = 0; i < r; ++i)
      e[n * (n - 1) + i] = t[i];
    return e;
  }
  function de(t, n, e, r, i, o, a, s) {
    var u = t[0],
      l = t[1],
      c = n[0],
      f = n[1],
      p = e[0],
      d = e[1],
      h = r[0],
      g = r[1],
      v = i[0],
      m = i[1],
      b = o[0],
      x = o[1],
      y = a[0],
      E = a[1],
      S = s[0],
      w = s[1],
      M = Wn(
        [
          u,
          0,
          c,
          0,
          p,
          0,
          h,
          0,
          l,
          0,
          f,
          0,
          d,
          0,
          g,
          0,
          1,
          0,
          1,
          0,
          1,
          0,
          1,
          0,
          0,
          u,
          0,
          c,
          0,
          p,
          0,
          h,
          0,
          l,
          0,
          f,
          0,
          d,
          0,
          g,
          0,
          1,
          0,
          1,
          0,
          1,
          0,
          1,
          -v * u,
          -m * u,
          -b * c,
          -x * c,
          -y * p,
          -E * p,
          -S * h,
          -w * h,
          -v * l,
          -m * l,
          -b * f,
          -x * f,
          -y * d,
          -E * d,
          -S * g,
          -w * g,
        ],
        8
      );
    if (!M.length) return [];
    var C = Kn(M, [v, m, b, x, y, E, S, w], 8);
    return (
      (C[8] = 1),
      Un(
        (function (t, n) {
          void 0 === n && (n = Math.sqrt(t.length));
          for (var e = [], r = 0; r < n; ++r)
            for (var i = 0; i < n; ++i) e[i * n + r] = t[n * r + i];
          return e;
        })(C),
        3,
        4
      )
    );
  }
  function he(t) {
    var n = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    return (
      t.forEach(function (t) {
        var e = t.matrixFunction,
          r = t.functionValue;
        e && (n = e(n, r));
      }),
      n
    );
  }
  function ge(t) {
    return (Pt(t) ? t : _t(t)).map(function (t) {
      var n = At(t),
        e = n.prefix,
        r = n.value,
        i = null,
        o = e,
        a = "";
      if ("translate" === e || "translateX" === e || "translate3d" === e) {
        var s = kt(r).map(function (t) {
            return parseFloat(t);
          }),
          u = s[0],
          l = s[1],
          c = void 0 === l ? 0 : l,
          f = s[2];
        (i = se), (a = [u, c, void 0 === f ? 0 : f]);
      } else if ("translateY" === e) {
        (i = se), (a = [0, (c = parseFloat(r)), 0]);
      } else if ("translateZ" === e) {
        (i = se), (a = [0, 0, parseFloat(r)]);
      } else if ("scale" === e || "scale3d" === e) {
        var p = kt(r).map(function (t) {
            return parseFloat(t);
          }),
          d = p[0],
          h = p[1],
          g = void 0 === h ? d : h,
          v = p[2];
        (i = oe), (a = [d, g, void 0 === v ? 1 : v]);
      } else if ("scaleX" === e) {
        (i = oe), (a = [(d = parseFloat(r)), 1, 1]);
      } else if ("scaleY" === e) {
        (i = oe), (a = [1, (g = parseFloat(r)), 1]);
      } else if ("scaleZ" === e) {
        (i = oe), (a = [1, 1, parseFloat(r)]);
      } else if (
        "rotate" === e ||
        "rotateZ" === e ||
        "rotateX" === e ||
        "rotateY" === e
      ) {
        var m = It(r),
          b = m.unit,
          x = m.value;
        "rotate" === e || "rotateZ" === e
          ? ((o = "rotateZ"), (i = ie))
          : "rotateX" === e
          ? (i = ee)
          : "rotateY" === e && (i = re),
          (a = "rad" === b ? x : (x * Math.PI) / 180);
      } else if ("matrix3d" === e)
        (i = ue),
          (a = kt(r).map(function (t) {
            return parseFloat(t);
          }));
      else if ("matrix" === e) {
        var y = kt(r).map(function (t) {
          return parseFloat(t);
        });
        (i = ue),
          (a = [
            y[0],
            y[1],
            0,
            0,
            y[2],
            y[3],
            0,
            0,
            0,
            0,
            1,
            0,
            y[4],
            y[5],
            0,
            1,
          ]);
      } else o = "";
      return {
        name: e,
        functionName: o,
        value: r,
        matrixFunction: i,
        functionValue: a,
      };
    });
  }
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation.  Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. ***************************************************************************** */ function ve(
    t
  ) {
    return t.length < 3
      ? 0
      : Math.abs(
          (function (t) {
            for (var n = 0, e = t.length - 1; e >= 0; --e) n += t[e];
            return n;
          })(
            t.map(function (n, e) {
              var r = t[e + 1] || t[0];
              return n[0] * r[1] - r[0] * n[1];
            })
          )
        ) / 2;
  }
  function me(t, n) {
    var e = n.width,
      r = n.height,
      i = n.left,
      o = n.top,
      a = be(t),
      s = a.minX,
      u = a.minY,
      l = a.maxX,
      c = a.maxY,
      f = e / (l - s),
      p = r / (c - u);
    return t.map(function (t) {
      return [i + (t[0] - s) * f, o + (t[1] - u) * p];
    });
  }
  function be(t) {
    var n = t.map(function (t) {
        return t[0];
      }),
      e = t.map(function (t) {
        return t[1];
      });
    return {
      minX: Math.min.apply(Math, n),
      minY: Math.min.apply(Math, e),
      maxX: Math.max.apply(Math, n),
      maxY: Math.max.apply(Math, e),
    };
  }
  function xe(t, n, e) {
    var r = t[0],
      i = t[1],
      o = be(n),
      a = o.minX,
      s = o.minY,
      u = o.maxX,
      l = o.maxY,
      c = [
        [a, i],
        [u, i],
      ],
      f = [
        [r, s],
        [r, l],
      ],
      p = ye(c[0], c[1]),
      d = ye(f[0], f[1]),
      h = we(n),
      g = [],
      v = [];
    return (
      h.forEach(function (t) {
        var n = ye(t[0], t[1]),
          e = Se(Ee(p, n), [c, t]),
          o = Se(Ee(d, n), [f, t]);
        (1 === e.length && t[0][1] === i) || g.push.apply(g, e),
          (1 === o.length && t[0][0] === r) || v.push.apply(v, o),
          n[0] || g.push.apply(g, e),
          n[1] || v.push.apply(v, o);
      }),
      (!e &&
        (Yt(g, function (t) {
          return t[0] === r;
        }) > -1 ||
          Yt(v, function (t) {
            return t[1] === i;
          }) > -1)) ||
        !!(
          g.filter(function (t) {
            return t[0] > r;
          }).length % 2 &&
          v.filter(function (t) {
            return t[1] > i;
          }).length % 2
        )
    );
  }
  function ye(t, n) {
    var e = t[0],
      r = t[1],
      i = n[0],
      o = n[1];
    if (e === i && r === o) return [0, 0, 0];
    if (e === i) return [1, 0, -e];
    if (r === o) return [0, 1, -r];
    var a = (i - e) / (r - o);
    return [1, a, -e - a * r];
  }
  function Ee(t, n) {
    var e,
      r,
      i = t[0],
      o = t[1],
      a = t[2],
      s = n[0],
      u = n[1],
      l = n[2],
      c = 0 === i && 0 === s,
      f = 0 === o && 0 === u;
    if (c && f) return [];
    if (c) {
      var p = -a / o;
      return p !== -l / u
        ? []
        : [
            [-1 / 0, p],
            [1 / 0, p],
          ];
    }
    if (f) {
      var d = -a / i;
      return d !== -l / s
        ? []
        : [
            [d, -1 / 0],
            [d, 1 / 0],
          ];
    }
    return 0 === i
      ? [[(e = -(u * (r = -a / o) + l) / s), r]]
      : 0 === s
      ? [[(e = -(o * (r = -l / u) + a) / i), r]]
      : 0 === o
      ? [[(e = -a / i), (r = -(s * e + l) / u)]]
      : 0 === u
      ? [[(e = -l / s), (r = -(i * e + a) / o)]]
      : [[(e = (o * l - u * a) / (u * i - o * s)), (r = -(i * e + a) / o)]];
  }
  function Se(t, n) {
    var e = n.map(function (t) {
      return [0, 1].map(function (n) {
        return [Math.min(t[0][n], t[1][n]), Math.max(t[0][n], t[1][n])];
      });
    });
    if (2 === t.length) {
      var r = t[0],
        i = r[0],
        o = r[1];
      if (i === t[1][0]) {
        var a = Math.max.apply(
            Math,
            e.map(function (t) {
              return t[1][0];
            })
          ),
          s = Math.min.apply(
            Math,
            e.map(function (t) {
              return t[1][1];
            })
          );
        return a > s
          ? []
          : [
              [i, a],
              [i, s],
            ];
      }
      if (o === t[1][1]) {
        var u = Math.max.apply(
            Math,
            e.map(function (t) {
              return t[0][0];
            })
          ),
          l = Math.min.apply(
            Math,
            e.map(function (t) {
              return t[0][1];
            })
          );
        return u > l
          ? []
          : [
              [u, o],
              [l, o],
            ];
      }
    }
    return t.filter(function (t) {
      return e.every(function (n) {
        return (
          n[0][0] <= t[0] &&
          t[0] <= n[0][1] &&
          n[1][0] <= t[1] &&
          t[1] <= n[1][1]
        );
      });
    });
  }
  function we(t) {
    return (function () {
      for (var t = 0, n = 0, e = arguments.length; n < e; n++)
        t += arguments[n].length;
      var r = Array(t),
        i = 0;
      for (n = 0; n < e; n++)
        for (var o = arguments[n], a = 0, s = o.length; a < s; a++, i++)
          r[i] = o[a];
      return r;
    })(t.slice(1), [t[0]]).map(function (n, e) {
      return [t[e], n];
    });
  }
  function Me(t, n) {
    return ve(
      (function (t, n) {
        var e = t.slice(),
          r = n.slice();
        -1 === Ut(e) && e.reverse(), -1 === Ut(r) && r.reverse();
        var i = we(e),
          o = we(r),
          a = i.map(function (t) {
            return ye(t[0], t[1]);
          }),
          s = o.map(function (t) {
            return ye(t[0], t[1]);
          }),
          u = [];
        a.forEach(function (t, n) {
          var e = i[n],
            a = [];
          s.forEach(function (r, i) {
            var s = Se(Ee(t, r), [e, o[i]]);
            a.push.apply(
              a,
              s.map(function (t) {
                return { index1: n, index2: i, pos: t };
              })
            );
          }),
            a.sort(function (t, n) {
              return Zt(e[0], t.pos) - Zt(e[0], n.pos);
            }),
            u.push.apply(u, a),
            xe(e[1], r) && u.push({ index1: n, index2: -1, pos: e[1] });
        }),
          o.forEach(function (t, n) {
            if (xe(t[1], e)) {
              var r = !1,
                i = Yt(u, function (t) {
                  return t.index2 === n ? ((r = !0), !1) : !!r;
                });
              -1 === i &&
                ((r = !1),
                (i = Yt(u, function (t) {
                  var e = t.index1,
                    i = t.index2;
                  return -1 === e && i + 1 === n ? ((r = !0), !1) : !!r;
                }))),
                -1 === i
                  ? u.push({ index1: -1, index2: n, pos: t[1] })
                  : u.splice(i, 0, { index1: -1, index2: n, pos: t[1] });
            }
          });
        var l = u.map(function (t) {
            return t.pos;
          }),
          c = {};
        return l.filter(function (t) {
          var n = t[0] + "x" + t[1];
          return !c[n] && ((c[n] = !0), !0);
        });
      })(t, n)
    );
  }
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT. See the Apache Version 2.0 License for specific language governing permissions and limitations under the License. ***************************************************************************** */ var Ce =
    function (t, n) {
      return (Ce =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  var De,
    Re =
      "function" == typeof Map
        ? void 0
        : ((De = 0),
          function (t) {
            return t.__DIFF_KEY__ || (t.__DIFF_KEY__ = ++De);
          }),
    Oe = (function (t) {
      function n(n) {
        return void 0 === n && (n = []), t.call(this, n, Re) || this;
      }
      return (
        (function (t, n) {
          function e() {
            this.constructor = t;
          }
          Ce(t, n),
            (t.prototype =
              null === n
                ? Object.create(n)
                : ((e.prototype = n.prototype), new e()));
        })(n, t),
        n
      );
    })(wt);
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. ***************************************************************************** */ var Pe =
    function () {
      return (Pe =
        Object.assign ||
        function (t) {
          for (var n, e = 1, r = arguments.length; e < r; e++)
            for (var i in (n = arguments[e]))
              Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
          return t;
        }).apply(this, arguments);
    };
  var ze = (function () {
      function t() {
        this._events = {};
      }
      var n = t.prototype;
      return (
        (n.on = function (t, n) {
          if (Ot(t)) for (var e in t) this.on(e, t[e]);
          else this._addEvent(t, n, {});
          return this;
        }),
        (n.off = function (t, n) {
          if (t)
            if (Ot(t)) for (var e in t) this.off(e);
            else if (n) {
              var r = this._events[t];
              if (r) {
                var i = Yt(r, function (t) {
                  return t.listener === n;
                });
                i > -1 && r.splice(i, 1);
              }
            } else this._events[t] = [];
          else this._events = {};
          return this;
        }),
        (n.once = function (t, n) {
          var e = this;
          return (
            n && this._addEvent(t, n, { once: !0 }),
            new Promise(function (n) {
              e._addEvent(t, n, { once: !0 });
            })
          );
        }),
        (n.emit = function (t, n) {
          var e = this;
          void 0 === n && (n = {});
          var r = this._events[t];
          if (!t || !r) return !0;
          var i = !1;
          return (
            (n.eventType = t),
            (n.stop = function () {
              i = !0;
            }),
            (n.currentTarget = this),
            (function () {
              for (var t = 0, n = 0, e = arguments.length; n < e; n++)
                t += arguments[n].length;
              var r = Array(t),
                i = 0;
              for (n = 0; n < e; n++)
                for (var o = arguments[n], a = 0, s = o.length; a < s; a++, i++)
                  r[i] = o[a];
              return r;
            })(r).forEach(function (r) {
              r.listener(n), r.once && e.off(t, r.listener);
            }),
            !i
          );
        }),
        (n.trigger = function (t, n) {
          return void 0 === n && (n = {}), this.emit(t, n);
        }),
        (n._addEvent = function (t, n, e) {
          var r = this._events;
          (r[t] = r[t] || []), r[t].push(Pe({ listener: n }, e));
        }),
        t
      );
    })(),
    Ge = function (t, n) {
      return (Ge =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT. See the Apache Version 2.0 License for specific language governing permissions and limitations under the License. ***************************************************************************** */ function Be(
    t
  ) {
    var n = t.container;
    return [n.scrollLeft, n.scrollTop];
  }
  var Te = (function (t) {
      function n() {
        var n = (null !== t && t.apply(this, arguments)) || this;
        return (
          (n.startRect = null),
          (n.startPos = []),
          (n.prevTime = 0),
          (n.timer = 0),
          n
        );
      }
      !(function (t, n) {
        function e() {
          this.constructor = t;
        }
        Ge(t, n),
          (t.prototype =
            null === n
              ? Object.create(n)
              : ((e.prototype = n.prototype), new e()));
      })(n, t);
      var e = n.prototype;
      return (
        (e.dragStart = function (t, n) {
          var e = n.container,
            r = 0,
            i = 0,
            o = 0,
            a = 0;
          if (e === document.body)
            (o = window.innerWidth), (a = window.innerHeight);
          else {
            var s = e.getBoundingClientRect();
            (r = s.top), (i = s.left), (o = s.width), (a = s.height);
          }
          (this.startPos = [t.clientX, t.clientY]),
            (this.startRect = { top: r, left: i, width: o, height: a });
        }),
        (e.drag = function (t, n) {
          var e = this,
            r = t.clientX,
            i = t.clientY,
            o = n.container,
            a = n.threshold,
            s = void 0 === a ? 0 : a,
            u = n.throttleTime,
            l = void 0 === u ? 0 : u,
            c = n.getScrollPosition,
            f = void 0 === c ? Be : c,
            p = this.startRect,
            d = this.startPos,
            h = Ft(),
            g = Math.max(l + this.prevTime - h, 0),
            v = [0, 0];
          if (
            (p.top > i - s
              ? (d[1] > p.top || i < d[1]) && (v[1] = -1)
              : p.top + p.height < i + s &&
                (d[1] < p.top + p.height || i > d[1]) &&
                (v[1] = 1),
            p.left > r - s
              ? (d[0] > p.left || r < d[0]) && (v[0] = -1)
              : p.left + p.width < r + s &&
                (d[0] < p.left + p.width || r > d[0]) &&
                (v[0] = 1),
            clearTimeout(this.timer),
            !v[0] && !v[1])
          )
            return !1;
          if (g > 0)
            return (
              (this.timer = window.setTimeout(function () {
                e.drag(t, n);
              }, g)),
              !1
            );
          this.prevTime = h;
          var m = f({ container: o, direction: v });
          this.trigger("scroll", { container: o, direction: v, inputEvent: t });
          var b = f({ container: o, direction: v }),
            x = b[0] - m[0],
            y = b[1] - m[1];
          return (
            !(!x && !y) &&
            (this.trigger("move", {
              offsetX: v[0] ? x : 0,
              offsetY: v[1] ? y : 0,
              inputEvent: t,
            }),
            l &&
              (this.timer = window.setTimeout(function () {
                e.drag(t, n);
              }, l)),
            !0)
          );
        }),
        (e.dragEnd = function () {
          clearTimeout(this.timer);
        }),
        n
      );
    })(ze),
    _e = function (t, n) {
      return (_e =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT. See the Apache Version 2.0 License for specific language governing permissions and limitations under the License. ***************************************************************************** */ var ke =
    function () {
      return (ke =
        Object.assign ||
        function (t) {
          for (var n, e = 1, r = arguments.length; e < r; e++)
            for (var i in (n = arguments[e]))
              Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
          return t;
        }).apply(this, arguments);
    };
  function Ae(t) {
    return (
      180 *
      ((n = [t[0].clientX, t[0].clientY]),
      (e = [t[1].clientX, t[1].clientY]),
      (r = e[0] - n[0]),
      (i = e[1] - n[1]),
      ((o = Math.atan2(i, r)) >= 0 ? o : o + 2 * Math.PI) / Math.PI)
    );
    var n, e, r, i, o;
  }
  function Ie(t) {
    return t.touches
      ? (function (t) {
          for (var n = Math.min(t.length, 2), e = [], r = 0; r < n; ++r)
            e.push(Fe(t[r]));
          return e;
        })(t.touches)
      : [Fe(t)];
  }
  function je(t, n, e) {
    var r = e.length,
      i = Ye(t, r),
      o = i.clientX,
      a = i.clientY,
      s = i.originalClientX,
      u = i.originalClientY,
      l = Ye(n, r),
      c = l.clientX,
      f = l.clientY,
      p = Ye(e, r);
    return {
      clientX: s,
      clientY: u,
      deltaX: o - c,
      deltaY: a - f,
      distX: o - p.clientX,
      distY: a - p.clientY,
    };
  }
  function Ne(t) {
    return Math.sqrt(
      Math.pow(t[0].clientX - t[1].clientX, 2) +
        Math.pow(t[0].clientY - t[1].clientY, 2)
    );
  }
  function Fe(t) {
    return { clientX: t.clientX, clientY: t.clientY };
  }
  function Ye(t, n) {
    void 0 === n && (n = t.length);
    for (
      var e = {
          clientX: 0,
          clientY: 0,
          originalClientX: 0,
          originalClientY: 0,
        },
        r = 0;
      r < n;
      ++r
    ) {
      var i = t[r];
      (e.originalClientX +=
        "originalClientX" in i ? i.originalClientX : i.clientX),
        (e.originalClientY +=
          "originalClientY" in i ? i.originalClientY : i.clientY),
        (e.clientX += i.clientX),
        (e.clientY += i.clientY);
    }
    return n
      ? {
          clientX: e.clientX / n,
          clientY: e.clientY / n,
          originalClientX: e.originalClientX / n,
          originalClientY: e.originalClientY / n,
        }
      : e;
  }
  var Xe = (function () {
      function t(t) {
        (this.prevClients = []),
          (this.startClients = []),
          (this.movement = 0),
          (this.length = 0),
          (this.startClients = t),
          (this.prevClients = t),
          (this.length = t.length);
      }
      var n = t.prototype;
      return (
        (n.addClients = function (t) {
          void 0 === t && (t = this.prevClients);
          var n = this.getPosition(t),
            e = n.deltaX,
            r = n.deltaY;
          return (
            (this.movement += Math.sqrt(e * e + r * r)),
            (this.prevClients = t),
            n
          );
        }),
        (n.getAngle = function (t) {
          return void 0 === t && (t = this.prevClients), Ae(t);
        }),
        (n.getRotation = function (t) {
          return (
            void 0 === t && (t = this.prevClients),
            Ae(t) - Ae(this.startClients)
          );
        }),
        (n.getPosition = function (t) {
          return je(t || this.prevClients, this.prevClients, this.startClients);
        }),
        (n.getPositions = function (t) {
          void 0 === t && (t = this.prevClients);
          var n = this.prevClients;
          return this.startClients.map(function (e, r) {
            return je([t[r]], [n[r]], [e]);
          });
        }),
        (n.getMovement = function (t) {
          var n = this.movement;
          if (!t) return n;
          var e = Ye(t, this.length),
            r = Ye(this.prevClients, this.length),
            i = e.clientX - r.clientX,
            o = e.clientY - r.clientY;
          return Math.sqrt(i * i + o * o) + n;
        }),
        (n.getDistance = function (t) {
          return void 0 === t && (t = this.prevClients), Ne(t);
        }),
        (n.getScale = function (t) {
          return (
            void 0 === t && (t = this.prevClients),
            Ne(t) / Ne(this.startClients)
          );
        }),
        (n.move = function (t, n) {
          this.startClients.forEach(function (e) {
            (e.clientX -= t), (e.clientY -= n);
          }),
            this.prevClients.forEach(function (e) {
              (e.clientX -= t), (e.clientY -= n);
            });
        }),
        t
      );
    })(),
    $e = ["textarea", "input"],
    Le = (function (t) {
      function n(n, e) {
        void 0 === e && (e = {});
        var r = t.call(this) || this;
        (r.options = {}),
          (r.flag = !1),
          (r.pinchFlag = !1),
          (r.datas = {}),
          (r.isDrag = !1),
          (r.isPinch = !1),
          (r.isMouse = !1),
          (r.isTouch = !1),
          (r.clientStores = []),
          (r.targets = []),
          (r.prevTime = 0),
          (r.doubleFlag = !1),
          (r.onDragStart = function (t, n) {
            if ((void 0 === n && (n = !0), r.flag || !1 !== t.cancelable)) {
              var e = r.options,
                i = e.container,
                o = e.pinchOutside,
                a = e.preventRightClick,
                s = e.preventDefault,
                u = e.checkInput,
                l = r.isTouch,
                c = !r.flag;
              if (c) {
                var f = document.activeElement,
                  p = t.target,
                  d = p.tagName.toLowerCase(),
                  h = $e.indexOf(d) > -1,
                  g = p.isContentEditable;
                if (h || g) {
                  if (u || f === p) return !1;
                  if (f && g && f.isContentEditable && f.contains(p)) return !1;
                } else if ((s || "touchstart" === t.type) && f) {
                  var v = f.tagName;
                  (f.isContentEditable || $e.indexOf(v) > -1) && f.blur();
                }
                if (
                  ((r.clientStores = [new Xe(Ie(t))]),
                  (r.flag = !0),
                  (r.isDrag = !1),
                  (r.datas = {}),
                  a && (3 === t.which || 2 === t.button))
                )
                  return r.initDrag(), !1;
                (r.doubleFlag = Ft() - r.prevTime < 200),
                  !1 ===
                    r.emit(
                      "dragStart",
                      ke(
                        {
                          datas: r.datas,
                          inputEvent: t,
                          isTrusted: n,
                          isDouble: r.doubleFlag,
                        },
                        r.getCurrentStore().getPosition()
                      )
                    ) && r.initDrag(),
                  r.flag && s && t.preventDefault();
              }
              if (!r.flag) return !1;
              var m = 0;
              if (
                (c &&
                  l &&
                  o &&
                  (m = setTimeout(function () {
                    Jt(i, "touchstart", r.onDragStart, { passive: !1 });
                  })),
                !c && l && o && Qt(i, "touchstart", r.onDragStart),
                r.flag &&
                  (function (t) {
                    return t.touches && t.touches.length >= 2;
                  })(t))
              ) {
                if (
                  (clearTimeout(m),
                  c && t.touches.length !== t.changedTouches.length)
                )
                  return;
                r.pinchFlag || r.onPinchStart(t);
              }
            }
          }),
          (r.onDrag = function (t, n) {
            if (r.flag) {
              var e = Ie(t),
                i = r.moveClients(e, t, !1);
              (r.pinchFlag || i.deltaX || i.deltaY) &&
                r.emit("drag", ke({}, i, { isScroll: !!n, inputEvent: t })),
                r.pinchFlag && r.onPinch(t, e),
                r.getCurrentStore().addClients(e);
            }
          }),
          (r.onDragEnd = function (t) {
            if (r.flag) {
              var n = r.options,
                e = n.pinchOutside,
                i = n.container;
              r.isTouch && e && Qt(i, "touchstart", r.onDragStart),
                (r.flag = !1);
              var o = r.getCurrentStore().getPosition(),
                a = Ft(),
                s = !r.isDrag && r.doubleFlag;
              (r.prevTime = r.isDrag || s ? 0 : a),
                r.emit(
                  "dragEnd",
                  ke(
                    {
                      datas: r.datas,
                      isDouble: s,
                      isDrag: r.isDrag,
                      inputEvent: t,
                    },
                    o
                  )
                ),
                r.pinchFlag && r.onPinchEnd(t),
                (r.clientStores = []);
            }
          }),
          (r.onBlur = function () {
            r.onDragEnd();
          });
        var i = [].concat(n);
        r.options = ke(
          {
            checkInput: !1,
            container: i.length > 1 ? window : i[0],
            preventRightClick: !0,
            preventDefault: !0,
            checkWindowBlur: !1,
            pinchThreshold: 0,
            events: ["touch", "mouse"],
          },
          e
        );
        var o = r.options,
          a = o.container,
          s = o.events,
          u = o.checkWindowBlur;
        if (
          ((r.isTouch = s.indexOf("touch") > -1),
          (r.isMouse = s.indexOf("mouse") > -1),
          (r.targets = i),
          r.isMouse &&
            (i.forEach(function (t) {
              Jt(t, "mousedown", r.onDragStart);
            }),
            Jt(a, "mousemove", r.onDrag),
            Jt(a, "mouseup", r.onDragEnd),
            Jt(a, "contextmenu", r.onDragEnd)),
          u && Jt(window, "blur", r.onBlur),
          r.isTouch)
        ) {
          var l = { passive: !1 };
          i.forEach(function (t) {
            Jt(t, "touchstart", r.onDragStart, l);
          }),
            Jt(a, "touchmove", r.onDrag, l),
            Jt(a, "touchend", r.onDragEnd, l),
            Jt(a, "touchcancel", r.onDragEnd, l);
        }
        return r;
      }
      !(function (t, n) {
        function e() {
          this.constructor = t;
        }
        _e(t, n),
          (t.prototype =
            null === n
              ? Object.create(n)
              : ((e.prototype = n.prototype), new e()));
      })(n, t);
      var e = n.prototype;
      return (
        (e.getMovement = function (t) {
          return (
            this.getCurrentStore().getMovement(t) +
            this.clientStores.slice(1).reduce(function (t, n) {
              return t + n.movement;
            }, 0)
          );
        }),
        (e.isDragging = function () {
          return this.isDrag;
        }),
        (e.isFlag = function () {
          return this.flag;
        }),
        (e.isPinchFlag = function () {
          return this.pinchFlag;
        }),
        (e.isDoubleFlag = function () {
          return this.doubleFlag;
        }),
        (e.isPinching = function () {
          return this.isPinch;
        }),
        (e.scrollBy = function (t, n, e, r) {
          void 0 === r && (r = !0),
            this.flag &&
              (this.clientStores[0].move(t, n), r && this.onDrag(e, !0));
        }),
        (e.move = function (t, n) {
          var e = t[0],
            r = t[1],
            i = this.getCurrentStore().prevClients;
          return this.moveClients(
            i.map(function (t) {
              var n = t.clientX,
                i = t.clientY;
              return {
                clientX: n + e,
                clientY: i + r,
                originalClientX: n,
                originalClientY: i,
              };
            }),
            n,
            !0
          );
        }),
        (e.triggerDragStart = function (t) {
          this.onDragStart(t, !1);
        }),
        (e.setEventDatas = function (t) {
          var n = this.datas;
          for (var e in t) n[e] = t[e];
          return this;
        }),
        (e.getEventDatas = function () {
          return this.datas;
        }),
        (e.unset = function () {
          var t = this,
            n = this.targets,
            e = this.options.container;
          this.off(),
            Qt(window, "blur", this.onBlur),
            this.isMouse &&
              (n.forEach(function (n) {
                Qt(n, "mousedown", t.onDragStart);
              }),
              Qt(e, "mousemove", this.onDrag),
              Qt(e, "mouseup", this.onDragEnd),
              Qt(e, "contextmenu", this.onDragEnd)),
            this.isTouch &&
              (n.forEach(function (n) {
                Qt(n, "touchstart", t.onDragStart);
              }),
              Qt(e, "touchstart", this.onDragStart),
              Qt(e, "touchmove", this.onDrag),
              Qt(e, "touchend", this.onDragEnd),
              Qt(e, "touchcancel", this.onDragEnd));
        }),
        (e.onPinchStart = function (t) {
          var n = this.options.pinchThreshold;
          if (!(this.isDrag && this.getMovement() > n)) {
            var e = new Xe(Ie(t));
            (this.pinchFlag = !0),
              this.clientStores.splice(0, 0, e),
              !1 ===
                this.emit(
                  "pinchStart",
                  ke(
                    {
                      datas: this.datas,
                      angle: e.getAngle(),
                      touches: this.getCurrentStore().getPositions(),
                    },
                    e.getPosition(),
                    { inputEvent: t }
                  )
                ) && (this.pinchFlag = !1);
          }
        }),
        (e.onPinch = function (t, n) {
          if (this.flag && this.pinchFlag && !(n.length < 2)) {
            var e = this.getCurrentStore();
            (this.isPinch = !0),
              this.emit(
                "pinch",
                ke(
                  {
                    datas: this.datas,
                    movement: this.getMovement(n),
                    angle: e.getAngle(n),
                    rotation: e.getRotation(n),
                    touches: e.getPositions(n),
                    scale: e.getScale(n),
                    distance: e.getDistance(n),
                  },
                  e.getPosition(n),
                  { inputEvent: t }
                )
              );
          }
        }),
        (e.onPinchEnd = function (t) {
          if (this.pinchFlag) {
            var n = this.isPinch;
            (this.isPinch = !1), (this.pinchFlag = !1);
            var e = this.getCurrentStore();
            this.emit(
              "pinchEnd",
              ke(
                { datas: this.datas, isPinch: n, touches: e.getPositions() },
                e.getPosition(),
                { inputEvent: t }
              )
            ),
              (this.isPinch = !1),
              (this.pinchFlag = !1);
          }
        }),
        (e.initDrag = function () {
          (this.clientStores = []),
            (this.pinchFlag = !1),
            (this.doubleFlag = !1),
            (this.prevTime = 0),
            (this.flag = !1);
        }),
        (e.getCurrentStore = function () {
          return this.clientStores[0];
        }),
        (e.moveClients = function (t, n, e) {
          var r = this.getCurrentStore()[e ? "addClients" : "getPosition"](t);
          return (
            (this.isDrag = !0),
            ke({ datas: this.datas }, r, {
              movement: this.getMovement(t),
              isDrag: this.isDrag,
              isPinch: this.isPinch,
              isScroll: !1,
              inputEvent: n,
            })
          );
        }),
        n
      );
    })(ze);
  var qe = function (t) {
    for (var n = 5381, e = t.length; e; ) n = (33 * n) ^ t.charCodeAt(--e);
    return n >>> 0;
  };
  function Ve(t, n, e, r) {
    var i = document.createElement("style");
    return (
      i.setAttribute("type", "text/css"),
      i.setAttribute("data-styled-id", t),
      e.nonce && i.setAttribute("nonce", e.nonce),
      (i.innerHTML = (function (t, n, e) {
        return e.original
          ? n
          : n.replace(/([^};{\s}][^};{]*|^\s*){/gm, function (n, e) {
              var r = e.trim();
              return (
                (r ? kt(r) : [""])
                  .map(function (n) {
                    var e = n.trim();
                    return 0 === e.indexOf("@")
                      ? e
                      : e.indexOf(":global") > -1
                      ? e.replace(/\:global/g, "")
                      : e.indexOf(":host") > -1
                      ? "" + e.replace(/\:host/g, "." + t)
                      : e
                      ? "." + t + " " + e
                      : "." + t;
                  })
                  .join(", ") + " {"
              );
            });
      })(t, n, e)),
      (r || document.head || document.body).appendChild(i),
      i
    );
  }
  function We(t) {
    var n,
      e = "rCS" + qe(t).toString(36),
      r = 0;
    return {
      className: e,
      inject: function (i, o) {
        void 0 === o && (o = {});
        var a,
          s = (function (t) {
            if (t && t.getRootNode) {
              var n = t.getRootNode();
              if (11 === n.nodeType) return n;
            }
          })(i),
          u = 0 === r;
        return (
          (s || u) && (a = Ve(e, t, o, s)),
          u && (n = a),
          s || ++r,
          {
            destroy: function () {
              s
                ? (i.removeChild(a), (a = null))
                : (r > 0 && --r,
                  0 === r && n && (n.parentNode.removeChild(n), (n = null)));
            },
          }
        );
      },
    };
  }
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABLITY OR NON-INFRINGEMENT. See the Apache Version 2.0 License for specific language governing permissions and limitations under the License. ***************************************************************************** */ var He =
    function (t, n) {
      return (He =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  function Ue(t, n) {
    function e() {
      this.constructor = t;
    }
    He(t, n),
      (t.prototype =
        null === n ? Object.create(n) : ((e.prototype = n.prototype), new e()));
  }
  var Ze = function () {
    return (Ze =
      Object.assign ||
      function (t) {
        for (var n, e = 1, r = arguments.length; e < r; e++)
          for (var i in (n = arguments[e]))
            Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
        return t;
      }).apply(this, arguments);
  };
  var Ke = (function (t) {
    function n() {
      var n = (null !== t && t.apply(this, arguments)) || this;
      return (n.injectResult = null), (n.tag = "div"), n;
    }
    Ue(n, t);
    var e = n.prototype;
    return (
      (e.render = function () {
        var t = this.props,
          n = t.className,
          e = void 0 === n ? "" : n;
        t.cspNonce;
        var r = t.portalContainer,
          i = (function (t, n) {
            var e = {};
            for (var r in t)
              Object.prototype.hasOwnProperty.call(t, r) &&
                n.indexOf(r) < 0 &&
                (e[r] = t[r]);
            if (
              null != t &&
              "function" == typeof Object.getOwnPropertySymbols
            ) {
              var i = 0;
              for (r = Object.getOwnPropertySymbols(t); i < r.length; i++)
                n.indexOf(r[i]) < 0 &&
                  Object.prototype.propertyIsEnumerable.call(t, r[i]) &&
                  (e[r[i]] = t[r[i]]);
            }
            return e;
          })(t, ["className", "cspNonce", "portalContainer"]),
          o = this.injector.className,
          a = this.tag,
          s = {};
        return (
          "simple-1.1.0".indexOf("simple") > -1 &&
            r &&
            (s = { portalContainer: r }),
          dn(
            a,
            Ze(
              {
                ref: ht(this, "element"),
                "data-styled-id": o,
                className: e + " " + o,
              },
              s,
              i
            )
          )
        );
      }),
      (e.componentDidMount = function () {
        this.injectResult = this.injector.inject(this.element, {
          nonce: this.props.cspNonce,
        });
      }),
      (e.componentWillUnmount = function () {
        this.injectResult.destroy(), (this.injectResult = null);
      }),
      (e.getElement = function () {
        return this.element;
      }),
      n
    );
  })(wn);
  function Je(t, n) {
    var e = We(n);
    return (function (n) {
      function r() {
        var r = (null !== n && n.apply(this, arguments)) || this;
        return (r.injector = e), (r.tag = t), r;
      }
      return Ue(r, n), r;
    })(Ke);
  }
  /*! ***************************************************************************** Copyright (c) Microsoft Corporation. Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted. THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE. ***************************************************************************** */ var Qe =
    function (t, n) {
      return (Qe =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  function tr(t, n) {
    function e() {
      this.constructor = t;
    }
    Qe(t, n),
      (t.prototype =
        null === n ? Object.create(n) : ((e.prototype = n.prototype), new e()));
  }
  var nr = function () {
    return (nr =
      Object.assign ||
      function (t) {
        for (var n, e = 1, r = arguments.length; e < r; e++)
          for (var i in (n = arguments[e]))
            Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
        return t;
      }).apply(this, arguments);
  };
  function er() {
    for (var t = 0, n = 0, e = arguments.length; n < e; n++)
      t += arguments[n].length;
    var r = Array(t),
      i = 0;
    for (n = 0; n < e; n++)
      for (var o = arguments[n], a = 0, s = o.length; a < s; a++, i++)
        r[i] = o[a];
    return r;
  }
  function rr(t, n) {
    return (
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="' +
      32 * t +
      'px" height="' +
      32 * t +
      'px" viewBox="0 0 32 32" ><path d="M 16,5 L 12,10 L 14.5,10 L 14.5,22 L 12,22 L 16,27 L 20,22 L 17.5,22 L 17.5,10 L 20, 10 L 16,5 Z" stroke-linejoin="round" stroke-width="1.2" fill="black" stroke="white" style="transform:rotate(' +
      n +
      'deg);transform-origin: 16px 16px"></path></svg>'
    );
  }
  var ir,
    or,
    ar = (
      void 0 === ir &&
      (function () {
        if (
          "undefined" == typeof navigator ||
          !navigator ||
          !navigator.userAgentData
        )
          return !1;
        var t = navigator.userAgentData,
          n = t.brands || t.uaList;
        return !(!n || !n.length);
      })()
        ? (function (t) {
            var n = navigator.userAgentData,
              e = (n.uaList || n.brands).slice(),
              r = n.mobile || !1,
              i = e[0],
              o = {
                name: i.brand,
                version: i.version,
                majorVersion: -1,
                webkit: !1,
                webkitVersion: "-1",
                chromium: !1,
                chromiumVersion: "-1",
                webview: !!kn(Fn, e).brand,
              },
              a = { name: "unknown", version: "-1", majorVersion: -1 };
            o.webkit =
              !o.chromium &&
              zn(Nn, function (t) {
                return An(e, t);
              });
            var s = kn(jn, e);
            if (
              ((o.chromium = !!s.brand),
              (o.chromiumVersion = s.version),
              !o.chromium)
            ) {
              var u = kn(Nn, e);
              (o.webkit = !!u.brand), (o.webkitVersion = u.version);
            }
            if (t) {
              var l = t.platform.toLowerCase(),
                c = Gn(Yn, function (t) {
                  return new RegExp("" + t.test, "g").exec(l);
                });
              (a.name = c ? c.id : l), (a.version = t.platformVersion);
            }
            var f = kn(In, e);
            return (
              f.brand &&
                ((o.name = f.brand),
                (o.version = t ? t.uaFullVersion : f.version)),
              "Linux armv8l" === navigator.platform
                ? (a.name = "android")
                : o.webkit && (a.name = r ? "ios" : "mac"),
              "ios" === a.name && o.webview && (o.version = "-1"),
              (a.version = Tn(a.version)),
              (o.version = Tn(o.version)),
              (a.majorVersion = parseInt(a.version, 10)),
              (o.majorVersion = parseInt(o.version, 10)),
              { browser: o, os: a, isMobile: r, isHints: !0 }
            );
          })()
        : Xn(ir)
    ).browser.webkit,
    sr =
      ar &&
      !!(or = /applewebkit\/([^\s]+)/g.exec(
        navigator.userAgent.toLowerCase()
      )) &&
      parseFloat(or[1]) < 605,
    ur = "moveable-",
    lr =
      "\n{\n\tposition: absolute;\n\twidth: 1px;\n\theight: 1px;\n\tleft: 0;\n\ttop: 0;\n    z-index: 3000;\n    --moveable-color: #4af;\n    --zoom: 1;\n    --zoompx: 1px;\n    will-change: transform;\n}\n.control-box {\n    z-index: 0;\n}\n.line, .control {\n    position: absolute;\n\tleft: 0;\n    top: 0;\n    will-change: transform;\n}\n.control {\n\twidth: 14px;\n\theight: 14px;\n\tborder-radius: 50%;\n\tborder: 2px solid #fff;\n\tbox-sizing: border-box;\n    background: #4af;\n    background: var(--moveable-color);\n\tmargin-top: -7px;\n    margin-left: -7px;\n    border: 2px solid #fff;\n    z-index: 10;\n}\n.padding {\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    width: 100px;\n    height: 100px;\n    transform-origin: 0 0;\n}\n.line {\n\twidth: 1px;\n    height: 1px;\n    background: #4af;\n    background: var(--moveable-color);\n\ttransform-origin: 0px 50%;\n}\n.line.dashed {\n    box-sizing: border-box;\n    background: transparent;\n}\n.line.dashed.horizontal {\n    border-top: 1px dashed #4af;\n    border-top-color: #4af;\n    border-top-color: var(--moveable-color);\n}\n.line.dashed.vertical {\n    border-left: 1px dashed #4af;\n    border-left-color: #4af;\n    border-left-color: var(--moveable-color);\n}\n.line.vertical {\n    transform: translateX(-50%);\n}\n.line.horizontal {\n    transform: translateY(-50%);\n}\n.line.vertical.bold {\n    width: 2px;\n}\n.line.horizontal.bold {\n    height: 2px;\n}\n\n.control.origin {\n\tborder-color: #f55;\n\tbackground: #fff;\n\twidth: 12px;\n\theight: 12px;\n\tmargin-top: -6px;\n    margin-left: -6px;\n\tpointer-events: none;\n}\n" +
      [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165]
        .map(function (t) {
          return (
            '\n.direction[data-rotation="' +
            t +
            '"] {\n\t' +
            (function (t) {
              var n = rr(1, t),
                e = rr(2, t),
                r = (45 * Math.round(t / 45)) % 180,
                i = "ns-resize";
              return (
                135 === r
                  ? (i = "nwse-resize")
                  : 45 === r
                  ? (i = "nesw-resize")
                  : 90 === r && (i = "ew-resize"),
                "cursor:" +
                  i +
                  ";cursor: url('" +
                  n +
                  "') 16 16, " +
                  i +
                  ";cursor: -webkit-image-set(url('" +
                  n +
                  "') 1x, url('" +
                  e +
                  "') 2x) 16 16, " +
                  i +
                  ";"
              );
            })(t) +
            "\n}\n"
          );
        })
        .join("\n") +
      "\n.group {\n    z-index: -1;\n}\n.area {\n    position: absolute;\n}\n.area-pieces {\n    position: absolute;\n    top: 0;\n    left: 0;\n    display: none;\n}\n.area.avoid, .area.pass {\n    pointer-events: none;\n}\n.area.avoid+.area-pieces {\n    display: block;\n}\n.area-piece {\n    position: absolute;\n}\n\n" +
      (sr
        ? ':global svg *:before {\n\tcontent:"";\n\ttransform-origin: inherit;\n}'
        : "") +
      "\n",
    cr = [
      [0, 1, 2],
      [1, 0, 3],
      [2, 0, 3],
      [3, 1, 2],
    ],
    fr = 1e-7,
    pr = 1e-9,
    dr = Math.pow(10, 10),
    hr = -dr,
    gr = ["n", "w", "s", "e", "nw", "ne", "sw", "se"],
    vr = {
      n: [0, 1],
      s: [2, 3],
      w: [2, 0],
      e: [1, 3],
      nw: [0],
      ne: [1],
      sw: [2],
      se: [3],
    },
    mr = { n: 0, s: 180, w: 270, e: 90, nw: 315, ne: 45, sw: 225, se: 135 },
    br = [
      "isMoveableElement",
      "updateRect",
      "updateTarget",
      "destroy",
      "dragStart",
      "isInside",
      "hitTest",
      "setState",
      "getRect",
      "request",
      "isDragging",
      "getManager",
    ];
  function xr() {
    for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
    return dt.apply(void 0, er([ur], t));
  }
  function yr(t, n, e) {
    return Zn(
      n,
      pe(e, n),
      t,
      pe(
        e.map(function (t) {
          return -t;
        }),
        n
      )
    );
  }
  function Er(t) {
    return Sr(ti(t, ":before")).map(function (n, e) {
      var r = It(n),
        i = r.value,
        o = r.unit;
      return (
        i *
        (function (t, n, e) {
          return "%" === n
            ? zr(t.ownerSVGElement)[e ? "width" : "height"] / 100
            : 1;
        })(t, o, 0 === e)
      );
    });
  }
  function Sr(t) {
    var n = t.transformOrigin;
    return n ? n.split(" ") : ["0", "0"];
  }
  function wr(t, n, e) {
    for (
      var r = document.body,
        i = !t || e ? t : t.parentElement,
        o = t === n || i === n,
        a = "relative";
      i && i !== r;

    ) {
      n === i && (o = !0);
      var s = ti(i),
        u = s.transform;
      if (
        ((a = s.position),
        "svg" === i.tagName.toLowerCase() ||
          "static" !== a ||
          (u && "none" !== u))
      )
        break;
      (i = i.parentElement), (a = "relative");
    }
    return {
      isStatic: "static" === a,
      isEnd: o || !i || i === r,
      offsetParent: i || r,
    };
  }
  function Mr(t, n, e, r) {
    var i,
      o = t.tagName.toLowerCase(),
      a = t.offsetLeft,
      s = t.offsetTop;
    if (r) {
      var u = (n || document.documentElement).getBoundingClientRect();
      (a -= u.left), (s -= u.top);
    }
    var l,
      c,
      f = Rt(a),
      p = !f;
    return (
      p || "svg" === o
        ? (c = (l = Sr(e).map(function (t) {
            return parseFloat(t);
          })).slice())
        : ((c = (l = sr
            ? Er(t)
            : Sr(e).map(function (t) {
                return parseFloat(t);
              })).slice()),
          (p = !0),
          (a = (i = (function (t, n) {
            if (!t.getBBox) return [0, 0];
            var e = t.getBBox(),
              r = zr(t.ownerSVGElement),
              i = e.x - r.x,
              o = e.y - r.y;
            return [i, o, n[0] - i, n[1] - o];
          })(t, l))[0]),
          (s = i[1]),
          (l[0] = i[2]),
          (l[1] = i[3])),
      {
        tagName: o,
        isSVG: f,
        hasOffset: p,
        offset: [a || 0, s || 0],
        origin: l,
        targetOrigin: c,
      }
    );
  }
  function Cr(t, n, e) {
    void 0 === e && (e = window.getComputedStyle(t));
    var r = window.getComputedStyle(document.body),
      i = r.position;
    if (!(n || (i && "static" !== i))) return [0, 0];
    var o = parseInt(r.marginLeft, 10),
      a = parseInt(r.marginTop, 10);
    return (
      "absolute" === e.position &&
        (("auto" === e.top && "auto" === e.bottom) || (a = 0),
        ("auto" === e.left && "auto" === e.right) || (o = 0)),
      [o, a]
    );
  }
  function Dr(t) {
    t.forEach(function (t) {
      var n = t.matrix;
      n && (t.matrix = Un(n, 3, 4));
    });
  }
  function Rr(t, n) {
    for (
      var e,
        r,
        i,
        o,
        a,
        s,
        u = t,
        l = [],
        c = !1,
        f = !1,
        p = 3,
        d = wr(n, n, !0).offsetParent;
      u && !c;

    ) {
      var h = ti(u),
        g = h.position,
        v = "fixed" === g,
        m =
          ((s = h.transform),
          (o =
            s && "none" !== s
              ? Ot(s)
                ? s
                : At(s)
                    .value.split(/s*,\s*/g)
                    .map(function (t) {
                      return parseFloat(t);
                    })
              : [1, 0, 0, 1, 0, 0]),
          void 0 === (a = void 0) && (a = 6 === o.length),
          a ? [o[0], o[1], 0, o[2], o[3], 0, o[4], o[5], 1] : o),
        b = m.length;
      f || 16 !== b || ((f = !0), (p = 4), Dr(l)),
        f && 9 === b && (m = Un(m, 3, 4));
      var x = Mr(u, n, h, v),
        y = x.tagName,
        E = x.hasOffset,
        S = x.isSVG,
        w = x.origin,
        M = x.targetOrigin,
        C = x.offset,
        D = C[0],
        R = C[1];
      "svg" === y && i
        ? (l.push({ type: "target", target: u, matrix: Gr(u, p) }),
          l.push({ type: "offset", target: u, matrix: ce(p) }))
        : "g" === y && t !== u && ((D = 0), (R = 0));
      var O = wr(u, n),
        P = O.offsetParent,
        z = O.isEnd,
        G = O.isStatic;
      ar &&
        E &&
        !S &&
        G &&
        ("relative" === g || "static" === g) &&
        ((D -= P.offsetLeft), (R -= P.offsetTop), (c = c || z));
      var B = 0,
        T = 0;
      if (
        (E && d !== P && ((B = P.clientLeft), (T = P.clientTop)),
        E && P === document.body)
      ) {
        var _ = Cr(u, !1, h);
        (D += _[0]), (R += _[1]);
      }
      if (
        (l.push({ type: "target", target: u, matrix: yr(m, p, w) }),
        E
          ? l.push({
              type: "offset",
              target: u,
              matrix: pe([D - u.scrollLeft + B, R - u.scrollTop + T], p),
            })
          : l.push({ type: "offset", target: u, origin: w }),
        i || (i = m),
        e || (e = w),
        r || (r = M),
        c || v)
      )
        break;
      (u = P), (c = z);
    }
    return (
      i || (i = ce(p)),
      e || (e = [0, 0]),
      r || (r = [0, 0]),
      {
        offsetContainer: d,
        matrixes: l,
        targetMatrix: i,
        transformOrigin: e,
        targetOrigin: r,
        is3d: f,
      }
    );
  }
  function Or(t, n, e, r) {
    var i;
    void 0 === e && (e = n);
    var o = 0,
      a = 0,
      s = 0,
      u = {};
    if (t) {
      var l = ti(t);
      (o = t.offsetWidth),
        (a = t.offsetHeight),
        Rt(o) && ((o = (i = Yr(t, l, !0))[0]), (a = i[1]));
    }
    if (t) {
      var c = (function (t, n, e, r) {
          void 0 === e && (e = n);
          var i = Rr(t, n),
            o = i.matrixes,
            a = i.is3d,
            s = i.targetMatrix,
            u = i.transformOrigin,
            l = i.targetOrigin,
            c = Rr(i.offsetContainer, e),
            f = c.matrixes,
            p = c.is3d,
            d = r || p || a,
            h = d ? 4 : 3,
            g = "svg" !== t.tagName.toLowerCase() && "ownerSVGElement" in t,
            v = n || document.body,
            m = s,
            b = ce(h),
            x = ce(h),
            y = ce(h),
            E = ce(h),
            S = o.length,
            w = wr(v, v, !0).offsetParent;
          f.reverse(), o.reverse(), !a && d && ((m = Un(m, 3, 4)), Dr(o));
          !p && d && Dr(f);
          f.forEach(function (t) {
            x = Kn(x, t.matrix, h);
          }),
            o.forEach(function (t, n) {
              if (
                (S - 2 === n && (y = b.slice()),
                S - 1 === n && (E = b.slice()),
                !t.matrix)
              ) {
                var e = (function (t, n, e, r, i) {
                  var o,
                    a = t.target,
                    s = t.origin,
                    u = n.matrix,
                    l = Yr(a, void 0, !0),
                    c = l[0],
                    f = l[1],
                    p = e.getBoundingClientRect(),
                    d = [0, 0];
                  e === document.body && (d = Cr(a, !0));
                  var h = a.getBoundingClientRect(),
                    g =
                      h.left -
                      p.left +
                      e.scrollLeft -
                      (e.clientLeft || 0) +
                      d[0],
                    v = h.top - p.top + e.scrollTop - (e.clientTop || 0) + d[1],
                    m = h.width,
                    b = h.height,
                    x = Zn(r, i, u),
                    y = kr(x, c, f, r),
                    E = y.left,
                    S = y.top,
                    w = y.width,
                    M = y.height,
                    C = Br(x, s, r),
                    D = Qn(C, [E, S]),
                    R = [g + (D[0] * m) / w, v + (D[1] * b) / M],
                    O = [0, 0],
                    P = 0;
                  for (; ++P < 10; ) {
                    var z = Wn(i, r);
                    (o = Qn(Br(z, R, r), Br(z, C, r))),
                      (O[0] = o[0]),
                      (O[1] = o[1]);
                    var G = kr(Zn(r, i, pe(O, r), u), c, f, r),
                      B = G.left - g,
                      T = G.top - v;
                    if (Math.abs(B) < 2 && Math.abs(T) < 2) break;
                    (R[0] -= B), (R[1] -= T);
                  }
                  return O.map(function (t) {
                    return Math.round(t);
                  });
                })(t, o[n + 1], w, h, Kn(x, b, h));
                t.matrix = pe(e, h);
              }
              b = Kn(b, t.matrix, h);
            });
          var M = !g && a;
          m || (m = ce(M ? 4 : 3));
          var C = Pr(g && 16 === m.length ? Un(m, 4, 3) : m, M);
          return {
            rootMatrix: (x = Vn(x, h, h)),
            beforeMatrix: y,
            offsetMatrix: E,
            allMatrix: b,
            targetMatrix: m,
            targetTransform: C,
            transformOrigin: u,
            targetOrigin: l,
            is3d: d,
          };
        })(t, n, e, r),
        f = Ar(c.allMatrix, c.transformOrigin, o, a);
      u = nr(nr({}, c), f);
      var p = Ar(c.allMatrix, [50, 50], 100, 100);
      s = Xr([p.pos1, p.pos2], p.direction);
    }
    var d = r ? 4 : 3;
    return nr(
      {
        width: o,
        height: a,
        rotation: s,
        rootMatrix: ce(d),
        beforeMatrix: ce(d),
        offsetMatrix: ce(d),
        allMatrix: ce(d),
        targetMatrix: ce(d),
        targetTransform: "",
        transformOrigin: [0, 0],
        targetOrigin: [0, 0],
        is3d: !!r,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        origin: [0, 0],
        pos1: [0, 0],
        pos2: [0, 0],
        pos3: [0, 0],
        pos4: [0, 0],
        direction: 1,
      },
      u
    );
  }
  function Pr(t, n) {
    return (
      void 0 === n && (n = t.length > 9),
      (n ? "matrix3d" : "matrix") + "(" + te(t, !n).join(",") + ")"
    );
  }
  function zr(t) {
    var n = t.clientWidth,
      e = t.clientHeight;
    if (!t)
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        clientWidth: n,
        clientHeight: e,
      };
    var r = t.viewBox,
      i = (r && r.baseVal) || { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: i.x,
      y: i.y,
      width: i.width || n,
      height: i.height || e,
      clientWidth: n,
      clientHeight: e,
    };
  }
  function Gr(t, n) {
    var e = zr(t),
      r = e.width,
      i = e.height,
      o = e.clientWidth,
      a = e.clientHeight,
      s = o / r,
      u = a / i,
      l = t.preserveAspectRatio.baseVal,
      c = l.align,
      f = l.meetOrSlice,
      p = [0, 0],
      d = [s, u],
      h = [0, 0];
    if (1 !== c) {
      var g = (c - 2) % 3,
        v = Math.floor((c - 2) / 3);
      (p[0] = (r * g) / 2), (p[1] = (i * v) / 2);
      var m = 2 === f ? Math.max(u, s) : Math.min(s, u);
      (d[0] = m),
        (d[1] = m),
        (h[0] = ((o - r) / 2) * g),
        (h[1] = ((a - i) / 2) * v);
    }
    var b = fe(d, n);
    return (b[n * (n - 1)] = h[0]), (b[n * (n - 1) + 1] = h[1]), yr(b, n, p);
  }
  function Br(t, n, e) {
    return ne(t, Hn(n, e), e);
  }
  function Tr(t, n, e, r) {
    return [
      [0, 0],
      [n, 0],
      [0, e],
      [n, e],
    ].map(function (n) {
      return Br(t, n, r);
    });
  }
  function _r(t) {
    var n = t.map(function (t) {
        return t[0];
      }),
      e = t.map(function (t) {
        return t[1];
      }),
      r = Math.min.apply(Math, n),
      i = Math.min.apply(Math, e),
      o = Math.max.apply(Math, n),
      a = Math.max.apply(Math, e);
    return {
      left: r,
      top: i,
      right: o,
      bottom: a,
      width: o - r,
      height: a - i,
    };
  }
  function kr(t, n, e, r) {
    return _r(Tr(t, n, e, r));
  }
  function Ar(t, n, e, r) {
    var i = 16 === t.length ? 4 : 3,
      o = Tr(t, e, r, i),
      a = o[0],
      s = a[0],
      u = a[1],
      l = o[1],
      c = l[0],
      f = l[1],
      p = o[2],
      d = p[0],
      h = p[1],
      g = o[3],
      v = g[0],
      m = g[1],
      b = Br(t, n, i),
      x = b[0],
      y = b[1],
      E = Math.min(s, c, d, v),
      S = Math.min(u, f, h, m),
      w = Math.max(s, c, d, v);
    return (
      (s = s - E || 0),
      {
        left: E,
        top: S,
        right: w,
        bottom: Math.max(u, f, h, m),
        origin: [(x = x - E || 0), (y = y - S || 0)],
        pos1: [s, (u = u - S || 0)],
        pos2: [(c = c - E || 0), (f = f - S || 0)],
        pos3: [(d = d - E || 0), (h = h - S || 0)],
        pos4: [(v = v - E || 0), (m = m - S || 0)],
        direction: Ut(o),
      }
    );
  }
  function Ir(t) {
    return Math.sqrt(t[0] * t[0] + t[1] * t[1]);
  }
  function jr(t, n) {
    return Ir([n[0] - t[0], n[1] - t[1]]);
  }
  function Nr(t, n, e, r) {
    void 0 === e && (e = 1), void 0 === r && (r = Ht(t, n));
    var i = jr(t, n);
    return {
      transform:
        "translateY(-50%) translate(" +
        t[0] +
        "px, " +
        t[1] +
        "px) rotate(" +
        r +
        "rad) scaleY(" +
        e +
        ")",
      width: i + "px",
    };
  }
  function Fr(t, n) {
    for (var e = [], r = 2; r < arguments.length; r++) e[r - 2] = arguments[r];
    var i = e.length,
      o =
        e.reduce(function (t, n) {
          return t + n[0];
        }, 0) / i,
      a =
        e.reduce(function (t, n) {
          return t + n[1];
        }, 0) / i;
    return {
      transform:
        "translateZ(0px) translate(" +
        o +
        "px, " +
        a +
        "px) rotate(" +
        t +
        "rad) scale(" +
        n +
        ")",
    };
  }
  function Yr(t, n, e, r) {
    void 0 === n && (n = window.getComputedStyle(t)),
      void 0 === r && (r = e || "border-box" === n.boxSizing);
    var i = t.offsetWidth,
      o = t.offsetHeight,
      a = !Rt(i);
    if ((e || r) && a) return [i, o];
    if (!a && "svg" !== t.tagName.toLowerCase()) {
      var s = t.getBBox();
      return [s.width, s.height];
    }
    return (
      (i = t.clientWidth),
      (o = t.clientHeight),
      e || r
        ? [
            i +
              (parseFloat(n.borderLeftWidth) || 0) +
              (parseFloat(n.borderRightWidth) || 0),
            o +
              (parseFloat(n.borderTopWidth) || 0) +
              (parseFloat(n.borderBottomWidth) || 0),
          ]
        : [
            i -
              (parseFloat(n.paddingLeft) || 0) -
              (parseFloat(n.paddingRight) || 0),
            o -
              (parseFloat(n.paddingTop) || 0) -
              (parseFloat(n.paddingBottom) || 0),
          ]
    );
  }
  function Xr(t, n) {
    return Ht(n > 0 ? t[0] : t[1], n > 0 ? t[1] : t[0]);
  }
  function $r(t, n, e, r, i) {
    var o = 1,
      a = [0, 0],
      s = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        clientLeft: 0,
        clientTop: 0,
        clientWidth: 0,
        clientHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      },
      u = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        clientLeft: 0,
        clientTop: 0,
        clientWidth: 0,
        clientHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      },
      l = {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: 0,
        height: 0,
        clientLeft: 0,
        clientTop: 0,
        clientWidth: 0,
        clientHeight: 0,
        scrollWidth: 0,
        scrollHeight: 0,
      },
      c = Or(n, e, i, !1);
    if (n) {
      var f = c.is3d ? 4 : 3,
        p = Ar(
          c.offsetMatrix,
          Jn(
            c.transformOrigin,
            (function (t, n) {
              void 0 === n && (n = Math.sqrt(t.length));
              for (var e = [], r = t[n * n - 1], i = 0; i < n - 1; ++i)
                e[i] = t[n * (n - 1) + i] / r;
              return (e[n - 1] = 0), e;
            })(c.targetMatrix, f)
          ),
          c.width,
          c.height
        );
      (o = p.direction),
        (a = Jn(p.origin, [p.left - c.left, p.top - c.top])),
        (s = Lr(n)),
        (u = Lr(wr(r, r, !0).offsetParent || document.body, !0)),
        t && (l = Lr(t));
    }
    return nr(
      {
        targetClientRect: s,
        containerClientRect: u,
        moveableClientRect: l,
        beforeDirection: o,
        beforeOrigin: a,
        originalBeforeOrigin: a,
        target: n,
      },
      c
    );
  }
  function Lr(t, n) {
    var e = 0,
      r = 0,
      i = 0,
      o = 0;
    if (t === document.body || t === document.documentElement)
      (i = window.innerWidth),
        (o = window.innerHeight),
        (e = -(
          document.documentElement.scrollLeft || document.body.scrollLeft
        )),
        (r = -(document.documentElement.scrollTop || document.body.scrollTop));
    else {
      var a = t.getBoundingClientRect();
      (e = a.left), (r = a.top), (i = a.width), (o = a.height);
    }
    var s = {
      left: e,
      right: e + i,
      top: r,
      bottom: r + o,
      width: i,
      height: o,
    };
    return (
      n &&
        ((s.clientLeft = t.clientLeft),
        (s.clientTop = t.clientTop),
        (s.clientWidth = t.clientWidth),
        (s.clientHeight = t.clientHeight),
        (s.scrollWidth = t.scrollWidth),
        (s.scrollHeight = t.scrollHeight),
        (s.overflow = "visible" !== ti(t).overflow)),
      s
    );
  }
  function qr(t) {
    if (t) {
      var n = t.getAttribute("data-direction");
      if (n) {
        var e = [0, 0];
        return (
          n.indexOf("w") > -1 && (e[0] = -1),
          n.indexOf("e") > -1 && (e[0] = 1),
          n.indexOf("n") > -1 && (e[1] = -1),
          n.indexOf("s") > -1 && (e[1] = 1),
          e
        );
      }
    }
  }
  function Vr(t, n) {
    return [Jn(n, t[0]), Jn(n, t[1]), Jn(n, t[2]), Jn(n, t[3])];
  }
  function Wr(t) {
    var n = t.left,
      e = t.top;
    return Vr([t.pos1, t.pos2, t.pos3, t.pos4], [n, e]);
  }
  function Hr(t, n) {
    return n ? Math.round(t / n) * n : t;
  }
  function Ur(t, n) {
    return (
      t.forEach(function (e, r) {
        t[r] = Hr(t[r], n);
      }),
      t
    );
  }
  function Zr(t, n) {
    t[n] && (t[n].unset(), (t[n] = null));
  }
  function Kr(t, n, e) {
    var r = n.datas;
    r.datas || (r.datas = {});
    var i = nr(nr({}, e), {
      target: t.state.target,
      clientX: n.clientX,
      clientY: n.clientY,
      inputEvent: n.inputEvent,
      currentTarget: t,
      moveable: t,
      datas: r.datas,
    });
    return r.isStartEvent ? (r.lastEvent = i) : (r.isStartEvent = !0), i;
  }
  function Jr(t, n, e) {
    var r = n.datas,
      i = "isDrag" in e ? e.isDrag : n.isDrag;
    return (
      r.datas || (r.datas = {}),
      nr(nr({ isDrag: i }, e), {
        moveable: t,
        target: t.state.target,
        clientX: n.clientX,
        clientY: n.clientY,
        inputEvent: n.inputEvent,
        currentTarget: t,
        lastEvent: r.lastEvent,
        isDouble: n.isDouble,
        datas: r.datas,
      })
    );
  }
  function Qr(t, n, e, r) {
    return t.triggerEvent(n, e, r);
  }
  function ti(t, n) {
    return window.getComputedStyle(t, n);
  }
  function ni(t, n, e) {
    var r = {},
      i = {};
    return t.filter(function (t) {
      var o = t.name;
      if (
        r[o] ||
        !n.some(function (n) {
          return t[n];
        })
      )
        return !1;
      if (!e && t.ableGroup) {
        if (i[t.ableGroup]) return !1;
        i[t.ableGroup] = !0;
      }
      return (r[o] = !0), !0;
    });
  }
  function ei(t, n) {
    return t === n || (null == t && null == n);
  }
  function ri(t, n) {
    var e = [],
      r = [];
    return (
      t.forEach(function (i, o) {
        var a = n(i, o, t),
          s = r.indexOf(a),
          u = e[s] || [];
        -1 === s && (r.push(a), e.push(u)), u.push(i);
      }),
      e
    );
  }
  function ii(t) {
    return t.reduce(function (t, n) {
      return t.concat(n);
    }, []);
  }
  function oi() {
    for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
    return (
      t.sort(function (t, n) {
        return Math.abs(n) - Math.abs(t);
      }),
      t[0]
    );
  }
  function ai(t, n, e) {
    return ne(Wn(t, e), Hn(n, e), e);
  }
  function si(t, n) {
    var e,
      r = t.is3d ? 4 : 3;
    return (
      (e = ai(t.rootMatrix, [n.distX, n.distY], r)),
      (n.distX = e[0]),
      (n.distY = e[1]),
      n
    );
  }
  function ui(t, n, e, r, i) {
    return Qn(Br(t, Jn(e, n), i), r);
  }
  function li(t, n, e) {
    return e ? (t / n) * 100 + "%" : t + "px";
  }
  function ci(t) {
    return Math.abs(t) <= fr ? 0 : t;
  }
  function fi(t) {
    return t.isRequest
      ? ("resizable" === t.requestAble || "scalable" === t.requestAble) &&
          t.parentDirection
      : Kt(t.inputEvent.target, xr("direction"));
  }
  function pi(t) {
    var n = {};
    for (var e in t) n[t[e]] = e;
    return n;
  }
  function di(t, n) {
    return t
      ? zt(t)
        ? n
          ? document.querySelector(t)
          : t
        : Gt(t)
        ? t()
        : "current" in t
        ? t.current
        : t
      : null;
  }
  function hi(t, n) {
    return t
      ? ((e = t) && Ot(e) && (Pt(e) || "length" in e)
          ? [].slice.call(t)
          : [t]
        ).reduce(function (t, e) {
          return zt(e) && n
            ? er(t, [].slice.call(document.querySelectorAll(e)))
            : (t.push(di(e, n)), t);
        }, [])
      : [];
    var e;
  }
  function gi(t, n) {
    return (function (t, n) {
      var e,
        r = t.direction,
        i = t.classNames,
        o = t.size,
        a = t.pos,
        s = t.zoom,
        u = t.key,
        l = "horizontal" === r,
        c = l ? "Y" : "X";
      return n.createElement("div", {
        key: u,
        className: i.join(" "),
        style:
          ((e = {}),
          (e[l ? "width" : "height"] = "" + o),
          (e.transform =
            "translate(" +
            a[0] +
            ", " +
            a[1] +
            ") translate" +
            c +
            "(-50%) scale" +
            c +
            "(" +
            s +
            ")"),
          e),
      });
    })(
      nr(nr({}, t), {
        classNames: er(
          [xr("line", "guideline", t.direction)],
          t.classNames
        ).filter(function (t) {
          return t;
        }),
        size: t.size || t.sizeValue + "px",
        pos:
          t.pos ||
          t.posValue.map(function (t) {
            return t + "px";
          }),
      }),
      n
    );
  }
  var vi = {
    name: "pinchable",
    updateRect: !0,
    props: { pinchable: Boolean },
    events: {
      onPinchStart: "pinchStart",
      onPinch: "pinch",
      onPinchEnd: "pinchEnd",
      onPinchGroupStart: "pinchGroupStart",
      onPinchGroup: "pinchGroup",
      onPinchGroupEnd: "pinchGroupEnd",
    },
    dragStart: function () {
      return !0;
    },
    pinchStart: function (t, n) {
      var e = n.datas,
        r = n.targets,
        i = n.angle,
        o = n.originalDatas,
        a = t.props,
        s = a.pinchable,
        u = a.ables;
      if (!s) return !1;
      var l = "onPinch" + (r ? "Group" : "") + "Start",
        c = "drag" + (r ? "Group" : "") + "ControlStart",
        f = (
          !0 === s
            ? t.controlAbles
            : u.filter(function (t) {
                return s.indexOf(t.name) > -1;
              })
        ).filter(function (t) {
          return t.canPinch && t[c];
        }),
        p = Kr(t, n, {});
      r && (p.targets = r);
      var d = Qr(t, l, p);
      (e.isPinch = !1 !== d), (e.ables = f);
      var h = e.isPinch;
      return (
        !!h &&
        (f.forEach(function (e) {
          if (((o[e.name] = o[e.name] || {}), e[c])) {
            var r = nr(nr({}, n), {
              datas: o[e.name],
              parentRotate: i,
              isPinch: !0,
            });
            e[c](t, r);
          }
        }),
        (t.state.snapRenderInfo = { request: n.isRequest, direction: [0, 0] }),
        h)
      );
    },
    pinch: function (t, n) {
      var e = n.datas,
        r = n.scale,
        i = n.distance,
        o = n.originalDatas,
        a = n.inputEvent,
        s = n.targets,
        u = n.angle;
      if (e.isPinch) {
        var l = i * (1 - 1 / r),
          c = Kr(t, n, {});
        s && (c.targets = s), Qr(t, "onPinch" + (s ? "Group" : ""), c);
        var f = e.ables,
          p = "drag" + (s ? "Group" : "") + "Control";
        return (
          f.forEach(function (e) {
            e[p] &&
              e[p](
                t,
                nr(nr({}, n), {
                  datas: o[e.name],
                  inputEvent: a,
                  parentDistance: l,
                  parentRotate: u,
                  isPinch: !0,
                })
              );
          }),
          c
        );
      }
    },
    pinchEnd: function (t, n) {
      var e = n.datas,
        r = n.isPinch,
        i = n.inputEvent,
        o = n.targets,
        a = n.originalDatas;
      if (e.isPinch) {
        var s = "onPinch" + (o ? "Group" : "") + "End",
          u = Jr(t, n, { isDrag: r });
        o && (u.targets = o), Qr(t, s, u);
        var l = e.ables,
          c = "drag" + (o ? "Group" : "") + "ControlEnd";
        return (
          l.forEach(function (e) {
            e[c] &&
              e[c](
                t,
                nr(nr({}, n), {
                  isDrag: r,
                  datas: a[e.name],
                  inputEvent: i,
                  isPinch: !0,
                })
              );
          }),
          r
        );
      }
    },
    pinchGroupStart: function (t, n) {
      return this.pinchStart(t, nr(nr({}, n), { targets: t.props.targets }));
    },
    pinchGroup: function (t, n) {
      return this.pinch(t, nr(nr({}, n), { targets: t.props.targets }));
    },
    pinchGroupEnd: function (t, n) {
      return this.pinchEnd(t, nr(nr({}, n), { targets: t.props.targets }));
    },
  };
  function mi(t, n, e, r, i) {
    var o = n.gesto.move(e, t.inputEvent),
      a = o.originalDatas || o.datas,
      s = a.draggable || (a.draggable = {});
    return nr(nr({}, i ? si(n, o) : o), {
      isDrag: !0,
      isPinch: !!r,
      parentEvent: !0,
      datas: s,
      originalDatas: t.originalDatas,
    });
  }
  var bi = (function () {
    function t() {
      (this.prevX = 0),
        (this.prevY = 0),
        (this.startX = 0),
        (this.startY = 0),
        (this.isDrag = !1),
        (this.isFlag = !1),
        (this.datas = { draggable: {} });
    }
    var n = t.prototype;
    return (
      (n.dragStart = function (t, n) {
        (this.isDrag = !1), (this.isFlag = !1);
        var e = n.originalDatas;
        return (
          (this.datas = e),
          e.draggable || (e.draggable = {}),
          nr(nr({}, this.move(t, n.inputEvent)), { type: "dragstart" })
        );
      }),
      (n.drag = function (t, n) {
        return this.move([t[0] - this.prevX, t[1] - this.prevY], n);
      }),
      (n.move = function (t, n) {
        var e, r;
        return (
          this.isFlag
            ? ((e = this.prevX + t[0]),
              (r = this.prevY + t[1]),
              (this.isDrag = !0))
            : ((this.prevX = t[0]),
              (this.prevY = t[1]),
              (this.startX = t[0]),
              (this.startY = t[1]),
              (e = t[0]),
              (r = t[1]),
              (this.isFlag = !0)),
          (this.prevX = e),
          (this.prevY = r),
          {
            type: "drag",
            clientX: e,
            clientY: r,
            inputEvent: n,
            isDrag: this.isDrag,
            distX: e - this.startX,
            distY: r - this.startY,
            deltaX: t[0],
            deltaY: t[1],
            datas: this.datas.draggable,
            originalDatas: this.datas,
            parentEvent: !0,
            parentGesto: this,
          }
        );
      }),
      t
    );
  })();
  function xi(t, n, e) {
    var r = e.originalDatas;
    r.groupable = r.groupable || {};
    var i = r.groupable;
    i.childDatas = i.childDatas || [];
    var o = i.childDatas;
    return t.moveables.map(function (t, r) {
      return (
        (o[r] = o[r] || {}),
        (o[r][n] = o[r][n] || {}),
        nr(nr({}, e), { datas: o[r][n], originalDatas: o[r] })
      );
    });
  }
  function yi(t, n, e, r, i, o) {
    var a = !!e.match(/Start$/g),
      s = !!e.match(/End$/g),
      u = i.isPinch,
      l = i.datas,
      c = xi(t, n.name, i),
      f = t.moveables,
      p = c.map(function (t, i) {
        var c = f[i],
          p = t;
        a
          ? (p = new bi().dragStart(r, t))
          : (c.state.gesto || (c.state.gesto = l.childGestos[i]),
            (p = mi(t, c.state, r, u, o)));
        var d = n[e](c, nr(nr({}, p), { parentFlag: !0 }));
        return s && (c.state.gesto = null), d;
      });
    return (
      a &&
        (l.childGestos = f.map(function (t) {
          return t.state.gesto;
        })),
      p
    );
  }
  function Ei(t, n, e, r, i, o) {
    void 0 === i &&
      (i = function (t, n) {
        return n;
      });
    var a = !!e.match(/End$/g),
      s = xi(t, n.name, r),
      u = t.moveables;
    return s.map(function (t, r) {
      var s,
        l = u[r];
      s = i(l, t);
      var c = n[e](l, nr(nr({}, s), { parentFlag: !0 }));
      return c && o && o(l, t, c, r), a && (l.state.gesto = null), c;
    });
  }
  function Si(t, n) {
    var e = n.clientX,
      r = n.clientY,
      i = n.datas,
      o = t.state,
      a = o.moveableClientRect,
      s = o.rootMatrix,
      u = o.is3d,
      l = o.pos1,
      c = Qn(ai(s, [e - a.left, r - a.top], u ? 4 : 3), l),
      f = Pi({ datas: i, distX: c[0], distY: c[1] });
    return [f[0], f[1]];
  }
  function wi(t, n) {
    var e = n.datas,
      r = t.state,
      i = r.allMatrix,
      o = r.beforeMatrix,
      a = r.is3d,
      s = r.left,
      u = r.top,
      l = r.origin,
      c = r.offsetMatrix,
      f = r.targetMatrix,
      p = r.transformOrigin,
      d = a ? 4 : 3;
    (e.is3d = a),
      (e.matrix = i),
      (e.targetMatrix = f),
      (e.beforeMatrix = o),
      (e.offsetMatrix = c),
      (e.transformOrigin = p),
      (e.inverseMatrix = Wn(i, d)),
      (e.inverseBeforeMatrix = Wn(o, d)),
      (e.absoluteOrigin = Hn(Jn([s, u], l), d)),
      (e.startDragBeforeDist = ne(e.inverseBeforeMatrix, e.absoluteOrigin, d)),
      (e.startDragDist = ne(e.inverseMatrix, e.absoluteOrigin, d));
  }
  function Mi(t, n) {
    var e = t.datas,
      r = t.originalDatas.beforeRenderable,
      i = e.transformIndex,
      o = r.nextTransforms,
      a = r.nextTransformAppendedIndexes,
      s =
        -1 === i
          ? o.length
          : i +
            a.filter(function (t) {
              return t < i;
            }).length,
      u = (function (t, n) {
        var e = t.slice(0, n < 0 ? void 0 : n),
          r = t.slice(0, n < 0 ? void 0 : n + 1),
          i = t[n] || "",
          o = n < 0 ? [] : t.slice(n),
          a = n < 0 ? [] : t.slice(n + 1),
          s = ge(e),
          u = ge(r),
          l = ge([i]),
          c = ge(o),
          f = ge(a),
          p = he(s),
          d = he(u),
          h = he(c),
          g = he(f),
          v = Kn(p, h, 4);
        return {
          transforms: t,
          beforeFunctionMatrix: p,
          beforeFunctionMatrix2: d,
          targetFunctionMatrix: he(l),
          afterFunctionMatrix: h,
          afterFunctionMatrix2: g,
          allFunctionMatrix: v,
          beforeFunctions: s,
          beforeFunctions2: u,
          targetFunction: l[0],
          afterFunctions: c,
          afterFunctions2: f,
          beforeFunctionTexts: e,
          beforeFunctionTexts2: r,
          targetFunctionText: i,
          afterFunctionTexts: o,
          afterFunctionTexts2: a,
        };
      })(o, s),
      l = u.targetFunction,
      c = "rotate" === n ? "rotateZ" : n;
    (e.beforeFunctionTexts = u.beforeFunctionTexts),
      (e.afterFunctionTexts = u.afterFunctionTexts),
      (e.beforeTransform = u.beforeFunctionMatrix),
      (e.beforeTransform2 = u.beforeFunctionMatrix2),
      (e.targetTansform = u.targetFunctionMatrix),
      (e.afterTransform = u.afterFunctionMatrix),
      (e.afterTransform2 = u.afterFunctionMatrix2),
      (e.targetAllTransform = u.allFunctionMatrix),
      l.functionName === c
        ? (e.afterFunctionTexts.splice(0, 1), (e.isAppendTransform = !1))
        : ((e.isAppendTransform = !0),
          (r.nextTransformAppendedIndexes = er(a, [s])));
  }
  function Ci(t, n, e) {
    return (
      t.beforeFunctionTexts.join(" ") +
      " " +
      (t.isAppendTransform ? e : n) +
      " " +
      t.afterFunctionTexts.join(" ")
    );
  }
  function Di(t) {
    var n = t.datas,
      e = Oi({ datas: n, distX: t.distX, distY: t.distY });
    return ne(
      Ri(
        n,
        (function (t, n) {
          for (var e = ce(n), r = 0; r < n - 1; ++r)
            e[n * (n - 1) + r] = t[r] || 0;
          return e;
        })([e[0], e[1]], 4)
      ),
      Hn([0, 0, 0], 4),
      4
    );
  }
  function Ri(t, n, e) {
    var r = t.beforeTransform,
      i = t.afterTransform,
      o = t.beforeTransform2,
      a = t.afterTransform2,
      s = t.targetAllTransform,
      u = e ? Kn(s, n, 4) : Kn(n, s, 4),
      l = Kn(Wn(e ? o : r, 4), u, 4);
    return Kn(l, Wn(e ? a : i, 4), 4);
  }
  function Oi(t) {
    var n = t.datas,
      e = t.distX,
      r = t.distY,
      i = n.inverseBeforeMatrix,
      o = n.is3d,
      a = n.startDragBeforeDist,
      s = o ? 4 : 3;
    return Qn(ne(i, Jn(n.absoluteOrigin, [e, r]), s), a);
  }
  function Pi(t, n) {
    var e = t.datas,
      r = t.distX,
      i = t.distY,
      o = e.inverseBeforeMatrix,
      a = e.inverseMatrix,
      s = e.is3d,
      u = e.startDragBeforeDist,
      l = e.startDragDist,
      c = s ? 4 : 3;
    return Qn(ne(n ? o : a, Jn(e.absoluteOrigin, [r, i]), c), n ? u : l);
  }
  function zi(t) {
    var n = [];
    return (
      t[1] >= 0 && (t[0] >= 0 && n.push(3), t[0] <= 0 && n.push(2)),
      t[1] <= 0 && (t[0] >= 0 && n.push(1), t[0] <= 0 && n.push(0)),
      n
    );
  }
  function Gi(t, n) {
    return zi(n).map(function (n) {
      return t[n];
    });
  }
  function Bi(t, n) {
    var e = Gi(t, n);
    return [
      Wt(
        e.map(function (t) {
          return t[0];
        })
      ),
      Wt(
        e.map(function (t) {
          return t[1];
        })
      ),
    ];
  }
  function Ti(t, n, e, r) {
    return Kn(t, yr(n, r, e), r);
  }
  function _i(t, n, e) {
    var r = t.transformOrigin,
      i = t.offsetMatrix,
      o = t.is3d,
      a = n.beforeTransform,
      s = n.afterTransform,
      u = o ? 4 : 3;
    return Ti(
      i,
      Un(
        Kn(
          Kn(
            a,
            (function (t) {
              return he(ge(t));
            })([e]),
            4
          ),
          s,
          4
        ),
        4,
        u
      ),
      r,
      u
    );
  }
  function ki(t) {
    var n = t.originalDatas.beforeRenderable;
    return {
      setTransform: function (e, r) {
        void 0 === r && (r = -1),
          (n.startTransforms = Pt(e) ? e : _t(e)),
          Ii(t, r);
      },
      setTransformIndex: function (n) {
        Ii(t, n);
      },
    };
  }
  function Ai(t) {
    Ii(t, -1);
  }
  function Ii(t, n) {
    var e = t.originalDatas.beforeRenderable,
      r = t.datas;
    if (((r.transformIndex = n), -1 !== n)) {
      var i = e.startTransforms[n];
      if (i) {
        var o = ge([i]);
        r.startValue = o[0].functionValue;
      }
    }
  }
  function ji(t, n) {
    t.originalDatas.beforeRenderable.nextTransforms = _t(n);
  }
  function Ni(t, n, e, r, i) {
    return (
      ji(i, n), { transform: n, drag: Vo.drag(t, mi(i, t.state, e, r, !1)) }
    );
  }
  function Fi(t, n, e, r, i) {
    var o = t.state,
      a = o.left,
      s = o.top,
      u = t.props.groupable,
      l = u ? a : 0,
      c = u ? s : 0,
      f = Qn(r, Xi(t, e, _i(t.state, i, n)));
    return Qn(f, [l, c]);
  }
  function Yi(t) {
    var n = t.state,
      e = n.width,
      r = n.height,
      i = n.transformOrigin;
    return [i[0] / (e / 2) - 1, i[1] / (r / 2) - 1];
  }
  function Xi(t, n, e) {
    void 0 === e && (e = t.state.allMatrix);
    var r = t.state,
      i = r.width,
      o = r.height,
      a = r.is3d ? 4 : 3;
    return Br(e, [(i / 2) * (1 + n[0]), (o / 2) * (1 + n[1])], a);
  }
  function $i(t, n, e, r, i, o) {
    var a = t.props.groupable,
      s = t.state,
      u = s.transformOrigin,
      l = s.targetMatrix,
      c = s.offsetMatrix,
      f = s.is3d,
      p = s.width,
      d = s.height,
      h = s.left,
      g = s.top,
      v = f ? 4 : 3,
      m = a ? h : 0,
      b = a ? g : 0;
    return Qn(
      (function (t, n, e, r, i, o) {
        var a = Bi(Tr(n, e, r, i), o);
        return [t[0] - a[0], t[1] - a[1]];
      })(
        i,
        Ti(
          c,
          l,
          (function (t, n, e, r, i, o) {
            return (
              void 0 === r && (r = n),
              void 0 === i && (i = e),
              void 0 === o && (o = [0, 0]),
              t
                ? t.map(function (t, a) {
                    var s = It(t),
                      u = s.value,
                      l = s.unit,
                      c = a ? i : r,
                      f = a ? e : n;
                    return "%" === t || isNaN(u)
                      ? f * (c ? o[a] / c : 0)
                      : "%" !== l
                      ? u
                      : (f * u) / 100;
                  })
                : o
            );
          })(o, n, e, p, d, u),
          v
        ),
        n,
        e,
        v,
        r
      ),
      [m, b]
    );
  }
  function Li(t, n) {
    return Bi(Wr(t.state), n);
  }
  function qi(t, n, e) {
    var r = Br(t, [n.clientLeft, n.clientTop], e);
    return [n.left + r[0], n.top + r[1]];
  }
  function Vi(t, n, e, r, i, o) {
    var a = i[0],
      s = i[1],
      u = o[0],
      l = o[1],
      c = [],
      f = r ? 0 : 1,
      p = "vertical" === n ? "horizontal" : "vertical",
      d = ri(
        t.filter(function (t) {
          return t.type === n;
        }),
        function (t) {
          return t.element;
        }
      )
        .map(function (t) {
          return t[0];
        })
        .filter(function (t) {
          var n = t.pos,
            e = t.sizes;
          return n[f] <= l && u <= n[f] + e[f];
        });
    return (
      d.forEach(function (t) {
        var n = t.pos[r],
          i = n + t.sizes[r];
        d.forEach(function (t) {
          var o = t.pos,
            u = t.sizes,
            l = t.element,
            f = t.className,
            h = o[r],
            g = h + u[r],
            v = 0,
            m = 0,
            b = !0;
          if (i <= h) a < (v = g - (m = i - h)) - e && (b = !1);
          else {
            if (!(g <= n)) return;
            s > (v = h - (m = n - g)) + e && (b = !1);
          }
          if (
            (b &&
              c.push({
                pos: "vertical" === p ? [v, o[1]] : [o[0], v],
                element: l,
                sizes: u,
                size: 0,
                type: p,
                gap: m,
                className: f,
                gapGuidelines: d,
              }),
            i <= a && s <= h)
          ) {
            var x = (h + i - (s - a)) / 2;
            Hr(a - (x - e), 0.1) >= 0 &&
              c.push({
                pos: "vertical" === p ? [x, o[1]] : [o[0], x],
                className: f,
                element: l,
                sizes: u,
                size: 0,
                type: p,
                gap: i - a,
                gapGuidelines: d,
              });
          }
        });
      }),
      c
    );
  }
  function Wi(t, n, e, r, i, o, a) {
    return (
      void 0 === o && (o = 0),
      void 0 === a && (a = 0),
      r &&
        r.forEach(function (e) {
          t.push({ type: "horizontal", pos: [0, Hr(e - a, 0.1)], size: n });
        }),
      i &&
        i.forEach(function (n) {
          t.push({ type: "vertical", pos: [Hr(n - o, 0.1), 0], size: e });
        }),
      t
    );
  }
  function Hi(t, n) {
    var e = [];
    if (!n.length) return e;
    var r = t.state,
      i = t.props.snapCenter,
      o = r.containerClientRect,
      a = r.targetClientRect,
      s = a.top,
      u = a.left,
      l = r.rootMatrix,
      c = r.is3d ? 4 : 3,
      f = qi(l, o, c),
      p = f[0],
      d = f[1],
      h = be(Wr(r)),
      g = Qn([h.minX, h.minY], ai(l, [u - p, s - d], c)).map(function (t) {
        return (n = t), Math.round(n % 1 == -0.5 ? n - 1 : n);
        var n;
      }),
      v = g[0],
      m = g[1];
    return (
      n.forEach(function (t) {
        var n = t.element,
          r = t.top,
          o = t.left,
          a = t.right,
          s = t.bottom,
          u = t.className,
          f = n.getBoundingClientRect(),
          h = f.left - p,
          g = f.top - d,
          b = g + f.height,
          x = h + f.width,
          y = ai(l, [h, g], c),
          E = y[0],
          S = y[1],
          w = ai(l, [x, b], c),
          M = w[0],
          C = w[1],
          D = M - E,
          R = C - S,
          O = [D, R];
        !1 !== r &&
          e.push({
            type: "vertical",
            element: n,
            pos: [Hr(E + v, 0.1), S],
            size: R,
            sizes: O,
            className: u,
          }),
          !1 !== s &&
            e.push({
              type: "vertical",
              element: n,
              pos: [Hr(M + v, 0.1), S],
              size: R,
              sizes: O,
              className: u,
            }),
          !1 !== o &&
            e.push({
              type: "horizontal",
              element: n,
              pos: [E, Hr(S + m, 0.1)],
              size: D,
              sizes: O,
              className: u,
            }),
          !1 !== a &&
            e.push({
              type: "horizontal",
              element: n,
              pos: [E, Hr(C + m, 0.1)],
              size: D,
              sizes: O,
              className: u,
            }),
          i &&
            (e.push({
              type: "vertical",
              element: n,
              pos: [Hr((E + M) / 2 + v, 0.1), S],
              size: R,
              sizes: O,
              center: !0,
              className: u,
            }),
            e.push({
              type: "horizontal",
              element: n,
              pos: [E, Hr((S + C) / 2 + m, 0.1)],
              size: D,
              sizes: O,
              center: !0,
              className: u,
            }));
      }),
      e
    );
  }
  function Ui(t, n, e) {
    void 0 === e && (e = []);
    var r = [],
      i = t.state;
    if (n && i.guidelines && i.guidelines.length) return r;
    var o = t.props.elementGuidelines,
      a = void 0 === o ? [] : o;
    if (!a.length) return r;
    var s = i.elementGuidelineValues || [],
      u = a.map(function (t) {
        return "parentElement" in t ? { element: t } : t;
      });
    i.elementGuidelineValues = u;
    var l,
      c,
      f =
        ((l = s.map(function (t) {
          return t.element;
        })),
        (c = u.map(function (t) {
          return t.element;
        })),
        St(l, c, Re)),
      p = f.added,
      d = f.removed.map(function (t) {
        return s[t].element;
      }),
      h = Hi(
        t,
        p
          .map(function (t) {
            return u[t];
          })
          .filter(function (t) {
            return (t.refresh && n) || (!t.refresh && !n);
          })
      );
    return er(
      e.filter(function (t) {
        return -1 === d.indexOf(t.element);
      }),
      h
    );
  }
  function Zi(t) {
    var n = t.state,
      e = n.staticGuidelines,
      r = n.containerClientRect,
      i = r.scrollHeight,
      o = r.scrollWidth,
      a = r.clientHeight,
      s = r.clientWidth,
      u = r.overflow,
      l = r.clientLeft,
      c = r.clientTop,
      f = t.props,
      p = f.snapHorizontal,
      d = void 0 === p || p,
      h = f.snapVertical,
      g = void 0 === h || h,
      v = f.snapGap,
      m = void 0 === v || v,
      b = f.verticalGuidelines,
      x = f.horizontalGuidelines,
      y = f.snapThreshold,
      E = void 0 === y ? 5 : y,
      S = er(e, Ui(t, !0));
    if (m) {
      var w = _r(Wr(t.state)),
        M = w.top,
        C = w.left,
        D = w.bottom,
        R = w.right,
        O = e.filter(function (t) {
          return t.element;
        });
      S.push.apply(
        S,
        er(
          Vi(O, "horizontal", E, 0, [C, R], [M, D]),
          Vi(O, "vertical", E, 1, [M, D], [C, R])
        )
      );
    }
    return Wi(S, u ? o : s, u ? i : a, d && x, g && b, l, c), S;
  }
  function Ki(t, n, e, r, i) {
    var o = t.props,
      a = o.snapElement,
      s = void 0 === a || a,
      u = (function () {
        for (var t = [], n = 0; n < arguments.length; n++) t[n] = arguments[n];
        for (var e = t.length - 1, r = 0; r < e; ++r) {
          var i = t[r];
          if (!Rt(i)) return i;
        }
        return t[e];
      })(i, o.snapThreshold, 5);
    return Ji(t.state.guidelines, n, e, {
      snapThreshold: u,
      snapCenter: r,
      snapElement: s,
    });
  }
  function Ji(t, n, e, r) {
    return {
      vertical: no(t, "vertical", n, r),
      horizontal: no(t, "horizontal", e, r),
    };
  }
  function Qi(t, n, e, r) {
    var i = t.props.snapCenter && e,
      o = ["left", "right"],
      a = ["top", "bottom"];
    return (
      i && (o.push("center"), a.push("middle")),
      (o = o.filter(function (t) {
        return t in n;
      })),
      (a = a.filter(function (t) {
        return t in n;
      })),
      Ki(
        t,
        o.map(function (t) {
          return n[t];
        }),
        a.map(function (t) {
          return n[t];
        }),
        i,
        r
      )
    );
  }
  function to(t) {
    var n = t.isSnap;
    if (!n) return { isSnap: !1, offset: 0, dist: -1, pos: 0, guideline: null };
    var e = t.posInfos[0],
      r = e.guidelineInfos[0],
      i = r.offset,
      o = r.dist,
      a = r.guideline;
    return { isSnap: n, offset: i, dist: o, pos: e.pos, guideline: a };
  }
  function no(t, n, e, r) {
    var i = void 0 === r ? {} : r,
      o = i.snapThreshold,
      a = void 0 === o ? 5 : o,
      s = i.snapElement,
      u = i.snapCenter;
    if (!t || !t.length) return { isSnap: !1, index: -1, posInfos: [] };
    var l = "vertical" === n ? 0 : 1,
      c = e
        .map(function (e, r) {
          var i = t
            .map(function (t) {
              var n = t.pos,
                r = e - n[l];
              return { offset: r, dist: Math.abs(r), guideline: t };
            })
            .filter(function (t) {
              var e = t.guideline,
                r = t.dist,
                i = e.type,
                o = e.center,
                l = e.element;
              return !((!s && l) || (!u && o) || i !== n || r > a);
            })
            .sort(function (t, n) {
              return t.dist - n.dist;
            });
          return { pos: e, index: r, guidelineInfos: i };
        })
        .filter(function (t) {
          return t.guidelineInfos.length > 0;
        })
        .sort(function (t, n) {
          return t.guidelineInfos[0].dist - n.guidelineInfos[0].dist;
        }),
      f = c.length > 0;
    return { isSnap: f, index: f ? c[0].index : -1, posInfos: c };
  }
  function eo(t, n) {
    var e = Math.abs(t.offset),
      r = Math.abs(n.offset);
    return t.isBound && n.isBound
      ? r - e
      : t.isBound
      ? -1
      : n.isBound
      ? 1
      : t.isSnap && n.isSnap
      ? r - e
      : t.isSnap
      ? -1
      : n.isSnap || e < fr
      ? 1
      : r < fr
      ? -1
      : e - r;
  }
  function ro(t, n) {
    return t.slice().sort(function (t, e) {
      var r = t.sign[n],
        i = e.sign[n],
        o = t.offset[n],
        a = e.offset[n];
      return r
        ? i
          ? eo(
              { isBound: t.isBound, isSnap: t.isSnap, offset: o },
              { isBound: e.isBound, isSnap: e.isSnap, offset: a }
            )
          : -1
        : 1;
    })[0];
  }
  function io(t, n) {
    var e = Wt([n[0][0], n[1][0]]),
      r = Wt([n[0][1], n[1][1]]);
    return { vertical: e <= t[0], horizontal: r <= t[1] };
  }
  function oo(t, n) {
    var e,
      r,
      i = n[0],
      o = n[1],
      a = o[0] - i[0],
      s = o[1] - i[1];
    if ((Math.abs(a) < fr && (a = 0), Math.abs(s) < fr && (s = 0), a))
      if (s) {
        (e = (s / a) * (t[0] - i[0]) + i[1]), (r = t[1]);
      } else (e = i[1]), (r = t[1]);
    else (e = i[0]), (r = t[0]);
    return e - r;
  }
  function ao(t, n, e) {
    void 0 === e && (e = fr);
    var r = oo(t[0], n) <= 0;
    return t.slice(1).every(function (t) {
      var i = oo(t, n);
      return i <= 0 === r || Math.abs(i) <= e;
    });
  }
  function so(t, n, e, r, i) {
    return (
      void 0 === i && (i = 0),
      (r && n - i <= t) || (!r && t <= e + i)
        ? { isBound: !0, offset: r ? n - t : e - t }
        : { isBound: !1, offset: 0 }
    );
  }
  function uo(t, n, e, r, i) {
    var o = t[0],
      a = t[1],
      s = n[0],
      u = n[1],
      l = ci(a[1] - o[1]),
      c = ci(a[0] - o[0]),
      f = ci(u[1] - s[1]);
    if (!ci(u[0] - s[0])) {
      if (i && !l) return { isBound: !1, offset: 0 };
      if (c) return so((l / c) * (s[0] - o[0]) + o[1], s[1], u[1], e, r);
      var p = s[0] - o[0];
      return { isBound: (d = Math.abs(p) <= (r || 0)), offset: d ? p : 0 };
    }
    if (!f) {
      if (i && !c) return { isBound: !1, offset: 0 };
      if (l) return so((s[1] - o[1]) / (l / c) + o[0], s[0], u[0], e, r);
      var d;
      p = s[1] - o[1];
      return { isBound: (d = Math.abs(p) <= (r || 0)), offset: d ? p : 0 };
    }
    return { isBound: !1, offset: 0 };
  }
  function lo(t, n, e, r) {
    return n.map(function (n) {
      var i = n[0],
        o = n[1],
        a = n[2],
        s = (function (t, n, e) {
          var r = t.props.innerBounds;
          if (!r)
            return {
              isAllBound: !1,
              isBound: !1,
              isVerticalBound: !1,
              isHorizontalBound: !1,
              offset: [0, 0],
            };
          var i = r.left,
            o = r.top,
            a = r.width,
            s = r.height,
            u = [
              [i, o],
              [i, o + s],
            ],
            l = [
              [i, o],
              [i + a, o],
            ],
            c = [
              [i + a, o],
              [i + a, o + s],
            ],
            f = [
              [i, o + s],
              [i + a, o + s],
            ],
            p = io(e, n),
            d = p.horizontal,
            h = p.vertical;
          if (ao([e, [i, o], [i + a, o], [i, o + s], [i + a, o + s]], n))
            return {
              isAllBound: !1,
              isBound: !1,
              isVerticalBound: !1,
              isHorizontalBound: !1,
              offset: [0, 0],
            };
          var g = uo(n, l, h),
            v = uo(n, f, h),
            m = uo(n, u, d),
            b = uo(n, c, d),
            x = g.isBound && v.isBound,
            y = g.isBound || v.isBound,
            E = m.isBound && b.isBound,
            S = m.isBound || b.isBound,
            w = oi(g.offset, v.offset),
            M = oi(m.offset, b.offset),
            C = [0, 0],
            D = !1,
            R = !1;
          return (
            Math.abs(M) < Math.abs(w)
              ? ((C = [w, 0]), (D = y), (R = x))
              : ((C = [0, M]), (D = S), (R = E)),
            {
              isAllBound: R,
              isVerticalBound: y,
              isHorizontalBound: S,
              isBound: D,
              offset: C,
            }
          );
        })(t, [o, a], e),
        u = s.isBound,
        l = s.offset,
        c = s.isVerticalBound,
        f = s.isHorizontalBound,
        p = Pi({ datas: r, distX: l[0], distY: l[1] }).map(function (t, n) {
          return t * (i[n] ? 2 / i[n] : 0);
        });
      return {
        sign: i,
        isBound: u,
        isVerticalBound: c,
        isHorizontalBound: f,
        isSnap: !1,
        offset: p,
      };
    });
  }
  function co(t, n, e) {
    var r,
      i = lo(
        t,
        fo(n, [0, 0], !1).map(function (t) {
          var n = t[0],
            e = t[1],
            r = t[2];
          return [
            n.map(function (t) {
              return 2 * Math.abs(t);
            }),
            e,
            r,
          ];
        }),
        Bi(n, [0, 0]),
        e
      ),
      o = ro(i, 0),
      a = ro(i, 1),
      s = 0,
      u = 0,
      l = o.isVerticalBound || a.isVerticalBound,
      c = o.isHorizontalBound || a.isHorizontalBound;
    return (
      (l || c) &&
        ((s = (r = (function (t, n) {
          var e = t.datas,
            r = t.distX,
            i = t.distY,
            o = e.beforeMatrix,
            a = e.matrix,
            s = e.is3d,
            u = e.startDragBeforeDist,
            l = e.startDragDist,
            c = e.absoluteOrigin,
            f = s ? 4 : 3;
          return Qn(ne(n ? o : a, Jn(n ? u : l, [r, i]), f), c);
        })({ datas: e, distX: -o.offset[0], distY: -a.offset[1] }))[0]),
        (u = r[1])),
      {
        vertical: { isBound: l, offset: s },
        horizontal: { isBound: c, offset: u },
      }
    );
  }
  function fo(t, n, e) {
    return (function (t, n) {
      var e = [],
        r = t[0],
        i = t[1];
      return (
        r && i
          ? e.push([[0, 2 * i], t, [-r, i]], [[2 * r, 0], t, [r, -i]])
          : r
          ? (e.push([
              [2 * r, 0],
              [r, 1],
              [r, -1],
            ]),
            n &&
              e.push(
                [
                  [0, -1],
                  [r, -1],
                  [-r, -1],
                ],
                [
                  [0, 1],
                  [r, 1],
                  [-r, 1],
                ]
              ))
          : i
          ? (e.push([
              [0, 2 * i],
              [1, i],
              [-1, i],
            ]),
            n &&
              e.push(
                [
                  [-1, 0],
                  [-1, i],
                  [-1, -i],
                ],
                [
                  [1, 0],
                  [1, i],
                  [1, -i],
                ]
              ))
          : e.push(
              [
                [-1, 0],
                [-1, -1],
                [-1, 1],
              ],
              [
                [1, 0],
                [1, -1],
                [1, 1],
              ],
              [
                [0, -1],
                [-1, -1],
                [1, -1],
              ],
              [
                [0, 1],
                [-1, 1],
                [1, 1],
              ]
            ),
        e
      );
    })(n, e).map(function (n) {
      var e = n[0],
        r = n[1],
        i = n[2];
      return [e, Bi(t, r), Bi(t, i)];
    });
  }
  function po(t, n, e, r) {
    var i = r
        ? t.map(function (t) {
            return ae(t, r);
          })
        : t,
      o = er([e], n);
    return [
      [i[0], i[1]],
      [i[1], i[3]],
      [i[3], i[2]],
      [i[2], i[0]],
    ].some(function (t) {
      return !ao(o, t);
    });
  }
  function ho(t, n, e, r, i) {
    var o = t.props.innerBounds,
      a = (i * Math.PI) / 180;
    if (!o) return [];
    var s = o.left,
      u = o.top,
      l = o.width,
      c = o.height,
      f = s - r[0],
      p = s + l - r[0],
      d = u - r[1],
      h = u + c - r[1],
      g = [
        [f, d],
        [p, d],
        [f, h],
        [p, h],
      ],
      v = Bi(e, [0, 0]);
    if (!po(e, g, v, 0)) return [];
    var m = [],
      b = g.map(function (t) {
        return [Ir(t), Ht([0, 0], t)];
      });
    return (
      [
        [e[0], e[1]],
        [e[1], e[3]],
        [e[3], e[2]],
        [e[2], e[0]],
      ].forEach(function (t) {
        var e = Ht(
            [0, 0],
            (function (t) {
              var n = t[0],
                e = t[1],
                r = e[0] - n[0],
                i = e[1] - n[1];
              if (!r) return [n[0], 0];
              if (!i) return [0, n[1]];
              var o = i / r,
                a = -o * n[0] + n[1];
              return [-a / (o + 1 / o), a / (o * o + 1)];
            })(t)
          ),
          r = (function (t) {
            var n = t[0],
              e = t[1],
              r = e[0] - n[0],
              i = e[1] - n[1];
            if (!r) return Math.abs(n[0]);
            if (!i) return Math.abs(n[1]);
            var o = i / r;
            return Math.abs((-o * n[0] + n[1]) / Math.sqrt(Math.pow(o, 2) + 1));
          })(t);
        m.push.apply(
          m,
          b
            .filter(function (t) {
              var n = t[0];
              return n && r <= n;
            })
            .map(function (t) {
              var n = t[0],
                i = t[1],
                o = Math.acos(n ? r / n : 0);
              return [a + (i + o) - e, a + (i - o) - e];
            })
            .reduce(function (t, n) {
              return t.push.apply(t, n), t;
            }, [])
            .filter(function (t) {
              return !po(n, g, v, t);
            })
            .map(function (t) {
              return Hr((180 * t) / Math.PI, fr);
            })
        );
      }),
      m
    );
  }
  function go(t, n, e) {
    var r = t || {},
      i = r.left,
      o = void 0 === i ? -1 / 0 : i,
      a = r.top,
      s = void 0 === a ? -1 / 0 : a,
      u = r.right,
      l = void 0 === u ? 1 / 0 : u,
      c = r.bottom,
      f = { left: o, top: s, right: l, bottom: void 0 === c ? 1 / 0 : c };
    return { vertical: vo(f, n, !0), horizontal: vo(f, e, !1) };
  }
  function vo(t, n, e) {
    var r = t[e ? "left" : "top"],
      i = t[e ? "right" : "bottom"],
      o = Math.min.apply(Math, n),
      a = Math.max.apply(Math, n),
      s = [];
    return (
      r + 1 > o && s.push({ isBound: !0, offset: o - r, pos: r }),
      i - 1 < a && s.push({ isBound: !0, offset: a - i, pos: i }),
      s.length || s.push({ isBound: !1, offset: 0, pos: 0 }),
      s.sort(function (t, n) {
        return Math.abs(n.offset) - Math.abs(t.offset);
      })
    );
  }
  function mo(t, n, e) {
    return (
      e
        ? t.map(function (t) {
            return ae(t, e);
          })
        : t
    ).some(function (t) {
      return (
        (t[0] < n.left && Math.abs(t[0] - n.left) > 0.1) ||
        (t[0] > n.right && Math.abs(t[0] - n.right) > 0.1) ||
        (t[1] < n.top && Math.abs(t[1] - n.top) > 0.1) ||
        (t[1] > n.bottom && Math.abs(t[1] - n.bottom) > 0.1)
      );
    });
  }
  function bo(t, n, e, r, i) {
    var o = t.props.bounds,
      a = (i * Math.PI) / 180;
    if (!o) return [];
    var s = o.left,
      u = void 0 === s ? -1 / 0 : s,
      l = o.top,
      c = void 0 === l ? -1 / 0 : l,
      f = o.right,
      p = void 0 === f ? 1 / 0 : f,
      d = o.bottom,
      h = void 0 === d ? 1 / 0 : d,
      g = u - r[0],
      v = p - r[0],
      m = c - r[1],
      b = h - r[1],
      x = { left: g, top: m, right: v, bottom: b };
    if (!mo(e, x, 0)) return [];
    var y = [];
    return (
      [
        [g, 0],
        [v, 0],
        [m, 1],
        [b, 1],
      ].forEach(function (t) {
        var r = t[0],
          i = t[1];
        e.forEach(function (t) {
          var e = Ht([0, 0], t);
          y.push.apply(
            y,
            (function (t, n, e) {
              var r = Ir(t),
                i = Math.sqrt(r * r - n * n) || 0;
              return [i, -i]
                .sort(function (n, r) {
                  return (
                    Math.abs(n - t[e ? 0 : 1]) - Math.abs(r - t[e ? 0 : 1])
                  );
                })
                .map(function (t) {
                  return Ht([0, 0], e ? [t, n] : [n, t]);
                });
            })(t, r, i)
              .map(function (t) {
                return a + t - e;
              })
              .filter(function (t) {
                return !mo(n, x, t);
              })
              .map(function (t) {
                return Hr((180 * t) / Math.PI, fr);
              })
          );
        });
      }),
      y
    );
  }
  var xo = {
    horizontal: ["left", "top", "width", "Y", "X"],
    vertical: ["top", "left", "height", "X", "Y"],
  };
  function yo(t) {
    var n = t.state;
    (n.guidelines && n.guidelines.length) ||
      ((n.elementGuidelineValues = []),
      (n.staticGuidelines = Ui(t, !1)),
      (n.guidelines = Zi(t)),
      (n.enableSnap = !0));
  }
  function Eo(t, n) {
    var e = t.props,
      r = e.snappable,
      i = e.bounds,
      o = e.innerBounds,
      a = e.verticalGuidelines,
      s = e.horizontalGuidelines,
      u = t.state,
      l = u.guidelines,
      c = u.enableSnap;
    return (
      !(!r || !c || (n && !0 !== r && r.indexOf(n) < 0)) &&
      !!(i || o || (l && l.length) || (a && a.length) || (s && s.length))
    );
  }
  function So(t, n, e, r, i) {
    var o = (function (t, n, e, r) {
      var i = n[0] - t[0],
        o = n[1] - t[1];
      Math.abs(i) < fr && (i = 0);
      Math.abs(o) < fr && (o = 0);
      if (!i) return r ? [0, 0] : [0, e];
      if (!o) return r ? [e, 0] : [0, 0];
      var a = o / i,
        s = t[1] - a * t[0];
      return r
        ? [e, a * (n[0] + e) + s - n[1]]
        : [(n[1] + e - s) / a - n[0], e];
    })(t, n, e, r);
    if (!o) return [0, 0];
    var a = Pi({ datas: i, distX: o[0], distY: o[1] });
    return [a[0], a[1]];
  }
  function wo(t, n, e, r, i, o) {
    var a = Tr(t, n, e, o ? 4 : 3);
    return Vr(
      a,
      Qn(
        r,
        (function (t, n) {
          return Bi(
            t,
            n.map(function (t) {
              return -t;
            })
          );
        })(a, i)
      )
    );
  }
  function Mo(t, n) {
    return t.isBound ? t.offset : n.isSnap ? n.offset : 0;
  }
  function Co(t, n) {
    return t.isBound ? t.offset : n.isSnap ? to(n).offset : 0;
  }
  function Do(t, n, e, r) {
    var i = (function (t, n, e) {
        var r = t.props.bounds || {},
          i = r.left,
          o = void 0 === i ? -1 / 0 : i,
          a = r.top,
          s = void 0 === a ? -1 / 0 : a,
          u = r.right,
          l = void 0 === u ? 1 / 0 : u,
          c = r.bottom,
          f = void 0 === c ? 1 / 0 : c,
          p = e[0],
          d = e[1],
          h = Qn(e, n),
          g = h[0],
          v = h[1];
        Math.abs(g) < fr && (g = 0), Math.abs(v) < fr && (v = 0);
        var m = v > 0,
          b = g > 0,
          x = { isBound: !1, offset: 0, pos: 0 },
          y = { isBound: !1, offset: 0, pos: 0 };
        if (0 === g && 0 === v) return { vertical: x, horizontal: y };
        if (0 === g)
          m
            ? f < d && ((y.pos = f), (y.offset = d - f))
            : s > d && ((y.pos = s), (y.offset = d - s));
        else if (0 === v)
          b
            ? l < p && ((x.pos = l), (x.offset = p - l))
            : o > p && ((x.pos = o), (x.offset = p - o));
        else {
          var E = v / g,
            S = e[1] - E * p,
            w = 0,
            M = 0,
            C = !1;
          b && l <= p
            ? ((w = E * l + S), (M = l), (C = !0))
            : !b && p <= o && ((w = E * o + S), (M = o), (C = !0)),
            C && (w < s || w > f) && (C = !1),
            C ||
              (m && f <= d
                ? ((M = ((w = f) - S) / E), (C = !0))
                : !m && d <= s && ((M = ((w = s) - S) / E), (C = !0))),
            C &&
              ((x.isBound = !0),
              (x.pos = M),
              (x.offset = p - M),
              (y.isBound = !0),
              (y.pos = w),
              (y.offset = d - w));
        }
        return { vertical: x, horizontal: y };
      })(t, n, e),
      o = i.horizontal,
      a = i.vertical,
      s = r
        ? { horizontal: { isSnap: !1 }, vertical: { isSnap: !1 } }
        : (function (t, n, e) {
            var r = e[0],
              i = e[1],
              o = n[0],
              a = n[1],
              s = Qn(e, n),
              u = s[0],
              l = s[1],
              c = l > 0,
              f = u > 0;
            (u = ci(u)), (l = ci(l));
            var p = { isSnap: !1, offset: 0, pos: 0 },
              d = { isSnap: !1, offset: 0, pos: 0 };
            if (0 === u && 0 === l) return { vertical: p, horizontal: d };
            var h = Ki(t, u ? [r] : [], l ? [i] : []),
              g = h.vertical,
              v = h.horizontal;
            g.posInfos.filter(function (t) {
              var n = t.pos;
              return f ? n >= o : n <= o;
            }),
              v.posInfos.filter(function (t) {
                var n = t.pos;
                return c ? n >= a : n <= a;
              }),
              (g.isSnap = g.posInfos.length > 0),
              (v.isSnap = v.posInfos.length > 0);
            var m = to(g),
              b = m.isSnap,
              x = m.guideline,
              y = to(v),
              E = y.isSnap,
              S = y.guideline,
              w = E ? S.pos[1] : 0,
              M = b ? x.pos[0] : 0;
            if (0 === u)
              E &&
                ((d.isSnap = !0), (d.pos = S.pos[1]), (d.offset = i - d.pos));
            else if (0 === l)
              b && ((p.isSnap = !0), (p.pos = M), (p.offset = r - M));
            else {
              var C = l / u,
                D = e[1] - C * r,
                R = 0,
                O = 0,
                P = !1;
              b
                ? ((R = C * (O = M) + D), (P = !0))
                : E && ((O = ((R = w) - D) / C), (P = !0)),
                P &&
                  ((p.isSnap = !0),
                  (p.pos = O),
                  (p.offset = r - O),
                  (d.isSnap = !0),
                  (d.pos = R),
                  (d.offset = i - R));
            }
            return { vertical: p, horizontal: d };
          })(t, n, e),
      u = s.horizontal,
      l = s.vertical,
      c = Mo(o, u),
      f = Mo(a, l),
      p = Math.abs(c),
      d = Math.abs(f);
    return {
      horizontal: { isBound: o.isBound, isSnap: u.isSnap, offset: c, dist: p },
      vertical: { isBound: a.isBound, isSnap: l.isSnap, offset: f, dist: d },
    };
  }
  function Ro(t, n, e, r) {
    void 0 === r && (r = e);
    var i = go(
        t.props.bounds,
        r.map(function (t) {
          return t[0];
        }),
        r.map(function (t) {
          return t[1];
        })
      ),
      o = i.horizontal,
      a = i.vertical,
      s = n
        ? {
            horizontal: { isSnap: !1, index: -1 },
            vertical: { isSnap: !1, index: -1 },
          }
        : Ki(
            t,
            e.map(function (t) {
              return t[0];
            }),
            e.map(function (t) {
              return t[1];
            }),
            t.props.snapCenter
          ),
      u = s.horizontal,
      l = s.vertical,
      c = Co(o[0], u),
      f = Co(a[0], l),
      p = Math.abs(c),
      d = Math.abs(f);
    return {
      horizontal: {
        isBound: o[0].isBound,
        isSnap: u.isSnap,
        snapIndex: u.index,
        offset: c,
        dist: p,
        bounds: o,
        snap: u,
      },
      vertical: {
        isBound: a[0].isBound,
        isSnap: l.isSnap,
        snapIndex: l.index,
        offset: f,
        dist: d,
        bounds: a,
        snap: l,
      },
    };
  }
  function Oo(t, n, e, r, i) {
    void 0 === i && (i = {});
    var o = go(n, e, r),
      a = o.horizontal,
      s = o.vertical,
      u = i.isRequest
        ? {
            horizontal: { isSnap: !1, index: -1 },
            vertical: { isSnap: !1, index: -1 },
          }
        : Ji(t, e, r, i),
      l = u.horizontal,
      c = u.vertical,
      f = Co(a[0], l),
      p = Co(s[0], c),
      d = Math.abs(f),
      h = Math.abs(p);
    return {
      horizontal: {
        isBound: a[0].isBound,
        isSnap: l.isSnap,
        snapIndex: l.index,
        offset: f,
        dist: d,
        bounds: a,
        snap: l,
      },
      vertical: {
        isBound: s[0].isBound,
        isSnap: c.isSnap,
        snapIndex: c.index,
        offset: p,
        dist: h,
        bounds: s,
        snap: c,
      },
    };
  }
  function Po(t) {
    return t ? t / Math.abs(t) : 0;
  }
  function zo(t, n, e, r, i, o) {
    return e.map(function (e) {
      var a = e[0],
        s = e[1],
        u = Bi(n, a),
        l = Bi(n, s),
        c = r ? Do(t, u, l, i) : Ro(t, i, [l]),
        f = c.horizontal,
        p = f.offset,
        d = f.isBound,
        h = f.isSnap,
        g = c.vertical,
        v = g.offset,
        m = g.isBound,
        b = g.isSnap,
        x = Qn(s, a);
      if (!v && !p)
        return { isBound: m || d, isSnap: b || h, sign: x, offset: [0, 0] };
      var y = (function (t, n, e, r) {
        var i = (Ht(t, n) / Math.PI) * 180,
          o = e.vertical,
          a = o.isBound,
          s = o.isSnap,
          u = o.dist,
          l = e.horizontal,
          c = l.isBound,
          f = l.isSnap,
          p = i % 180,
          d = p < 3 || p > 177,
          h = p > 87 && p < 93;
        return l.dist < u && (a || (s && !h && (!r || !d)))
          ? "vertical"
          : !c && (!f || d || (r && h))
          ? ""
          : "horizontal";
      })(u, l, c, r);
      if (!y) return { sign: x, isBound: !1, isSnap: !1, offset: [0, 0] };
      var E = "vertical" === y,
        S = So(u, l, -(E ? v : p), E, o).map(function (t, n) {
          return t * (x[n] ? 2 / x[n] : 0);
        });
      return { sign: x, isBound: E ? m : d, isSnap: E ? b : h, offset: S };
    });
  }
  function Go(t, n, e, r, i, o) {
    var a = (function (t, n) {
        var e = [],
          r = [-t[0], -t[1]];
        return (
          t[0] && t[1]
            ? (e.push([r, [t[0], -t[1]]], [r, [-t[0], t[1]]]),
              n && e.push([r, t]))
            : t[0]
            ? n
              ? e.push(
                  [r, [r[0], -1]],
                  [r, [r[0], 1]],
                  [r, [t[0], -1]],
                  [r, t],
                  [r, [t[0], 1]]
                )
              : e.push(
                  [
                    [r[0], -1],
                    [t[0], -1],
                  ],
                  [
                    [r[0], 0],
                    [t[0], 0],
                  ],
                  [
                    [r[0], 1],
                    [t[0], 1],
                  ]
                )
            : t[1]
            ? n
              ? e.push(
                  [r, [-1, r[1]]],
                  [r, [1, r[1]]],
                  [r, [-1, t[1]]],
                  [r, [1, t[1]]],
                  [r, t]
                )
              : e.push(
                  [
                    [-1, r[1]],
                    [-1, t[1]],
                  ],
                  [
                    [0, r[1]],
                    [0, t[1]],
                  ],
                  [
                    [1, r[1]],
                    [1, t[1]],
                  ]
                )
            : e.push(
                [r, [1, 0]],
                [r, [-1, 0]],
                [r, [0, -1]],
                [r, [0, 1]],
                [
                  [1, 0],
                  [1, -1],
                ],
                [
                  [1, 0],
                  [1, 1],
                ],
                [
                  [0, 1],
                  [1, 1],
                ],
                [
                  [0, 1],
                  [-1, 1],
                ],
                [
                  [-1, 0],
                  [-1, -1],
                ],
                [
                  [-1, 0],
                  [-1, 1],
                ],
                [
                  [0, -1],
                  [1, -1],
                ],
                [
                  [0, -1],
                  [-1, -1],
                ]
              ),
          e
        );
      })(e, r),
      s = fo(n, e, r),
      u = er(zo(t, n, a, r, i, o), lo(t, s, Bi(n, [0, 0]), o)),
      l = ro(u, 0),
      c = ro(u, 1);
    return {
      width: { isBound: l.isBound, offset: l.offset[0] },
      height: { isBound: c.isBound, offset: c.offset[1] },
    };
  }
  function Bo(t, n, e, r, i, o, a, s) {
    for (
      var u = Wr(t.state), l = t.props.keepRatio, c = 0, f = 0, p = 0;
      p < 2;
      ++p
    ) {
      var d = Go(t, n(c, f), i, l, a, s),
        h = d.width,
        g = d.height,
        v = h.isBound,
        m = g.isBound,
        b = h.offset,
        x = g.offset;
      if ((1 === p && (v || (b = 0), m || (x = 0)), 0 === p && a && !v && !m))
        return [0, 0];
      if (l) {
        var y = Math.abs(b) * (e ? 1 / e : 1),
          E = Math.abs(x) * (r ? 1 / r : 1);
        (v && m ? y < E : m || (!v && y < E))
          ? (b = (e * x) / r)
          : (x = (r * b) / e);
      }
      (c += b), (f += x);
    }
    if (i[0] && i[1]) {
      var S = (function (t, n, e, r, i) {
          var o = [-e[0], -e[1]],
            a = t.state,
            s = a.width,
            u = a.height,
            l = t.props.bounds,
            c = 1 / 0,
            f = 1 / 0;
          if (l) {
            var p = [
                [e[0], -e[1]],
                [-e[0], e[1]],
              ],
              d = l.left,
              h = void 0 === d ? -1 / 0 : d,
              g = l.top,
              v = void 0 === g ? -1 / 0 : g,
              m = l.right,
              b = void 0 === m ? 1 / 0 : m,
              x = l.bottom,
              y = void 0 === x ? 1 / 0 : x;
            p.forEach(function (t) {
              var e = t[0] !== o[0],
                a = t[1] !== o[1],
                l = Bi(n, t),
                p = Po(t[1] - o[1]),
                d = Po(t[0] - o[0]),
                g = (360 * Ht(r, l)) / Math.PI;
              if (a) {
                var m = l.slice();
                (Math.abs(g - 360) < 2 || Math.abs(g - 180) < 2) &&
                  (m[1] = r[1]);
                var x = So(r, m, (r[1] < l[1] ? y : v) - l[1], !1, i)[1];
                isNaN(x) || (f = u + p * x);
              }
              if (e) {
                (m = l.slice()),
                  (Math.abs(g - 90) < 2 || Math.abs(g - 270) < 2) &&
                    (m[0] = r[0]);
                var E = So(r, m, (r[0] < l[0] ? b : h) - l[0], !0, i)[0];
                isNaN(E) || (c = s + d * E);
              }
            });
          }
          return { maxWidth: c, maxHeight: f };
        })(t, u, i, o, s),
        w = S.maxWidth,
        M = S.maxHeight,
        C = (function (t, n, e, r, i, o, a, s, u) {
          var l = Ro(t, s, [Bi(n, a)]),
            c = l.horizontal.offset,
            f = l.vertical.offset;
          if (f || c) {
            var p = Pi({ datas: u, distX: -f, distY: -c }),
              d = p[0],
              h = p[1];
            return [
              Math.min(i || 1 / 0, e + a[0] * d) - e,
              Math.min(o || 1 / 0, r + a[1] * h) - r,
            ];
          }
          return [0, 0];
        })(t, n(c, f), e + c, r + f, w, M, i, a, s);
      (c += b = C[0]), (f += x = C[1]);
    }
    return [c, f];
  }
  function To(t, n, e, r) {
    if (!Eo(t, "rotatable")) return r;
    var i = n.pos1,
      o = n.pos2,
      a = n.pos3,
      s = n.pos4,
      u = (r * Math.PI) / 180,
      l = [i, o, a, s].map(function (t) {
        return Qn(t, e);
      }),
      c = l.map(function (t) {
        return ae(t, u);
      }),
      f = er(bo(t, l, c, e, r), ho(t, l, c, e, r));
    return (
      f.sort(function (t, n) {
        return Math.abs(t - r) - Math.abs(n - r);
      }),
      f.length ? f[0] : r
    );
  }
  function _o(t, n, e, r, i) {
    var o = i.width,
      a = i.height,
      s = i.fixedPosition;
    if (!Eo(t, "scalable")) return [0, 0];
    var u = i.is3d,
      l = Bo(
        t,
        function (t, r) {
          return wo(
            (function (t, n) {
              var e = t.transformOrigin,
                r = t.offsetMatrix,
                i = t.is3d ? 4 : 3;
              return Ti(r, Kn(t.targetMatrix, fe(n, i), i), e, i);
            })(i, Jn(n, [t / o, r / a])),
            o,
            a,
            s,
            e,
            u
          );
        },
        o,
        a,
        e,
        s,
        r,
        i
      );
    return [l[0] / o, l[1] / a];
  }
  function ko(t, n, e, r, i, o) {
    if (!Eo(t, "draggable"))
      return [
        { isSnap: !1, isBound: !1, offset: 0 },
        { isSnap: !1, isBound: !1, offset: 0 },
      ];
    var a = Vr(o.absolutePoses, [n, e]),
      s = _r(a),
      u = s.left,
      l = s.right,
      c = s.top,
      f = s.bottom,
      p = [
        [u, c],
        [l, c],
        [u, f],
        [l, f],
      ];
    t.props.snapCenter && p.push([(u + l) / 2, (c + f) / 2]);
    var d = Ro(t, i, p, a),
      h = d.vertical,
      g = d.horizontal,
      v = co(t, a, o),
      m = v.vertical,
      b = v.horizontal,
      x = h.isSnap,
      y = g.isSnap,
      E = h.isBound || m.isBound,
      S = g.isBound || b.isBound,
      w = (function (t, n, e, r, i) {
        var o = n[0],
          a = n[1],
          s = e[0],
          u = e[1],
          l = r[0],
          c = r[1],
          f = i[0],
          p = i[1],
          d = -f,
          h = -p;
        if (t && o && a) {
          (d = 0), (h = 0);
          var g = [];
          if (
            (s && u
              ? g.push([0, p], [f, 0])
              : s
              ? g.push([f, 0])
              : u
              ? g.push([0, p])
              : l && c
              ? g.push([0, p], [f, 0])
              : l
              ? g.push([f, 0])
              : c && g.push([0, p]),
            g.length)
          ) {
            g.sort(function (t, n) {
              return Ir(Qn([o, a], t)) - Ir(Qn([o, a], n));
            });
            var v = g[0];
            if (v[0] && Math.abs(o) > fr)
              (d = -v[0]), (h = (a * Math.abs(o + d)) / Math.abs(o) - a);
            else if (v[1] && Math.abs(a) > fr) {
              var m = a;
              (h = -v[1]), (d = (o * Math.abs(a + h)) / Math.abs(m) - o);
            }
            if (t && u && s)
              if (Math.abs(d) > fr && Math.abs(d) < Math.abs(f))
                (d *= b = Math.abs(f) / Math.abs(d)), (h *= b);
              else if (Math.abs(h) > fr && Math.abs(h) < Math.abs(p)) {
                var b;
                (d *= b = Math.abs(p) / Math.abs(h)), (h *= b);
              } else (d = oi(-f, d)), (h = oi(-p, h));
          }
        } else (d = o || s ? -f : 0), (h = a || u ? -p : 0);
        return [d, h];
      })(
        r,
        [n, e],
        [E, S],
        [x, y],
        [oi(h.offset, m.offset), oi(g.offset, b.offset)]
      );
    return [
      { isBound: E, isSnap: x, offset: w[0] },
      { isBound: S, isSnap: y, offset: w[1] },
    ];
  }
  function Ao(t) {
    var n = [];
    return (
      t.forEach(function (t) {
        t.guidelineInfos.forEach(function (t) {
          var e = t.guideline;
          n.indexOf(e) > -1 || n.push(e);
        });
      }),
      n
    );
  }
  function Io(t, n, e, r) {
    var i = t - e,
      o = i < 0 ? i + n : r;
    return { size: (i < 0 ? 0 : i) - o, pos: o };
  }
  function jo(t, n, e, r) {
    var i = [],
      o = ri(
        t.filter(function (t) {
          var n = t.element,
            e = t.gap;
          return n && !e;
        }),
        function (t) {
          var e = t.element,
            o = t.pos,
            a = o[r],
            s = (Math.min(0, a - n) < 0 ? -1 : 1) + "_" + o[r ? 0 : 1],
            u = (function (t, n, e) {
              var r = Yt(t, n);
              return r > -1 ? t[r] : e;
            })(i, function (t) {
              var n = t[0],
                r = t[1];
              return e === n && a === r;
            });
          return u ? u[2] : (i.push([e, a, s]), s);
        }
      );
    return (
      o.forEach(function (t) {
        t.sort(function (t, i) {
          return (
            Io(t.pos[r], t.size, n, e).size - Io(i.pos[r], t.size, n, e).size ||
            t.pos[r ? 0 : 1] - i.pos[r ? 0 : 1]
          );
        });
      }),
      o
    );
  }
  function No(t, n, e, r, i, o, a, s, u, l, c, f) {
    var p = t.props,
      d = p.zoom,
      h = p.isDisplaySnapDigit,
      g = void 0 === h || h,
      v = xo[n],
      m = v[0],
      b = v[1],
      x = v[2],
      y = v[4];
    return ii(
      e.map(function (t, e) {
        var p = !0;
        return t.map(function (t, h) {
          var v,
            E = t.pos,
            S = t.size,
            w = Io(E[l], S, i, o),
            M = w.pos,
            C = w.size;
          if (C < s) return null;
          var D = p;
          p = !1;
          var R = g && D ? parseFloat(C.toFixed(u)) : 0;
          return f.createElement(
            "div",
            {
              key: n + "LinkGuideline" + e + "-" + h,
              className: xr("guideline-group", n),
              style:
                ((v = {}),
                (v[m] = r + M + "px"),
                (v[b] = -a + E[l ? 0 : 1] + "px"),
                (v[x] = C + "px"),
                v),
            },
            gi(
              {
                direction: n,
                classNames: [xr("dashed")],
                size: "100%",
                posValue: [0, 0],
                sizeValue: C,
                zoom: d,
              },
              f
            ),
            f.createElement(
              "div",
              {
                className: xr("size-value"),
                style: {
                  transform: "translate" + y + "(-50%) scale(" + d + ")",
                },
              },
              R > 0 ? c(R) : ""
            )
          );
        });
      })
    );
  }
  function Fo(t, n, e, r, i, o, a, s) {
    var u = t.props.zoom;
    return e.map(function (t, e) {
      var l = t.type,
        c = t.pos,
        f = [0, 0];
      return (
        (f[a] = r),
        (f[a ? 0 : 1] = -i + c),
        gi(
          {
            key: n + "TargetGuideline" + e,
            classNames: [xr("target", "bold", l)],
            posValue: f,
            sizeValue: o,
            zoom: u,
            direction: n,
          },
          s
        )
      );
    });
  }
  function Yo(t, n, e, r, i) {
    var o = t.props.zoom;
    return e.map(function (t, e) {
      var a = t.pos,
        s = t.size,
        u = t.element,
        l = [-r[0] + a[0], -r[1] + a[1]];
      return gi(
        {
          key: n + "Guideline" + e,
          classNames: u ? [xr("bold")] : [],
          direction: n,
          posValue: l,
          sizeValue: s,
          zoom: o,
        },
        i
      );
    });
  }
  function Xo(t, n, e, r) {
    var i = t.filter(function (t) {
        var e = t.element,
          r = t.gap,
          i = t.type;
        return e && r && i === n;
      }),
      o = "vertical" === n ? [0, 1] : [1, 0],
      a = o[0],
      s = o[1];
    return ii(
      i.map(function (t) {
        var n = t.pos,
          i = t.gap,
          o = t.gapGuidelines,
          u = t.sizes,
          l = (function () {
            for (var t = [], n = 0; n < arguments.length; n++)
              t[n] = arguments[n];
            return (
              t.sort(function (t, n) {
                return Math.abs(t) - Math.abs(n);
              }),
              t[0]
            );
          })(n[s] + u[s] - e[s], n[s] - e[s] - r[s]),
          c = Math.min(u[s], r[s]);
        l > 0 && l > c
          ? (l = 2 * (l - c / 2))
          : l < 0 && l < -c && (l = 2 * (l + c / 2));
        var f = (l > 0 ? 0 : r[s]) + l / 2;
        return er(
          (function (t, n, e, r, i, o, a) {
            var s = Math.abs(o),
              u = i[n] + (o > 0 ? r[0] : 0);
            return t
              .filter(function (t) {
                return t.pos[n] <= e[n];
              })
              .sort(function (t, e) {
                var r = t.pos;
                return e.pos[n] - r[n];
              })
              .filter(function (t) {
                var e = t.pos,
                  r = t.sizes,
                  i = e[n];
                return Hr(i + r[n], 1e-4) === Hr(u - s, 1e-4) && ((u = i), !0);
              })
              .map(function (t) {
                var r = -e[n] + t.pos[n] + t.sizes[n];
                return nr(nr({}, t), {
                  gap: o,
                  renderPos: n ? [a, r] : [r, a],
                });
              });
          })(o, a, e, r, n, i, f),
          (function (t, n, e, r, i, o, a) {
            var s = Math.abs(o),
              u = i[n] + (o < 0 ? r[n] : 0);
            return t
              .filter(function (t) {
                return t.pos[n] > e[n];
              })
              .sort(function (t, e) {
                var r = t.pos,
                  i = e.pos;
                return r[n] - i[n];
              })
              .filter(function (t) {
                var e = t.pos,
                  r = t.sizes,
                  i = e[n];
                return Hr(i, 1e-4) === Hr(u + s, 1e-4) && ((u = i + r[n]), !0);
              })
              .map(function (t) {
                var r = -e[n] + t.pos[n] - s;
                return nr(nr({}, t), {
                  gap: o,
                  renderPos: n ? [a, r] : [r, a],
                });
              });
          })(o, a, e, r, n, i, f)
        );
      })
    );
  }
  function $o(t, n, e, r, i) {
    var o = t.props,
      a = o.snapDigit,
      s = void 0 === a ? 0 : a,
      u = o.isDisplaySnapDigit,
      l = void 0 === u || u,
      c = o.zoom,
      f = "horizontal" === n ? "X" : "Y",
      p = "horizontal" === n ? "width" : "height";
    return e.map(function (t, e) {
      var o,
        a = t.renderPos,
        u = t.gap,
        d = t.className,
        h = Math.abs(u),
        g = l ? parseFloat(h.toFixed(s)) : 0;
      return i.createElement(
        "div",
        {
          key: n + "GapGuideline" + e,
          className: xr("guideline-group", n),
          style:
            ((o = { left: a[0] + "px", top: a[1] + "px" }),
            (o[p] = h + "px"),
            o),
        },
        gi(
          {
            direction: n,
            classNames: [xr("gap"), d],
            size: "100%",
            posValue: [0, 0],
            sizeValue: h,
            zoom: c,
          },
          i
        ),
        i.createElement(
          "div",
          {
            className: xr("size-value", "gap"),
            style: { transform: "translate" + f + "(-50%) scale(" + c + ")" },
          },
          g > 0 ? r(g) : ""
        )
      );
    });
  }
  function Lo(t, n, e, r, i, o) {
    var a = go(o || t.props.bounds, n, e),
      s = a.vertical,
      u = a.horizontal;
    s.forEach(function (t) {
      t.isBound && r.push({ type: "bounds", pos: t.pos });
    }),
      u.forEach(function (t) {
        t.isBound && i.push({ type: "bounds", pos: t.pos });
      });
    var l = (function (t) {
        var n = t.props.innerBounds;
        if (!n) return { vertical: [], horizontal: [] };
        var e = t.getRect(),
          r = e.pos1,
          i = e.pos2,
          o = e.pos3,
          a = e.pos4,
          s = Bi([r, i, o, a], [0, 0]),
          u = n.left,
          l = n.top,
          c = n.width,
          f = n.height,
          p = [
            [u, l],
            [u, l + f],
          ],
          d = [
            [u, l],
            [u + c, l],
          ],
          h = [
            [u + c, l],
            [u + c, l + f],
          ],
          g = [
            [u, l + f],
            [u + c, l + f],
          ],
          v = [],
          m = [],
          b = { top: !1, bottom: !1, left: !1, right: !1 };
        return (
          [
            [r, i],
            [i, a],
            [a, o],
            [o, r],
          ].forEach(function (t) {
            var n = io(s, t),
              e = n.horizontal,
              r = n.vertical,
              i = uo(t, d, r, 1, !0),
              o = uo(t, g, r, 1, !0),
              a = uo(t, p, e, 1, !0),
              x = uo(t, h, e, 1, !0);
            i.isBound && !b.top && (v.push(l), (b.top = !0)),
              o.isBound && !b.bottom && (v.push(l + f), (b.bottom = !0)),
              a.isBound && !b.left && (m.push(u), (b.left = !0)),
              x.isBound && !b.right && (m.push(u + c), (b.right = !0));
          }),
          { horizontal: v, vertical: m }
        );
      })(t),
      c = l.vertical,
      f = l.horizontal;
    c.forEach(function (t) {
      Yt(r, function (n) {
        var e = n.type,
          r = n.pos;
        return "bounds" === e && r === t;
      }) >= 0 || r.push({ type: "bounds", pos: t });
    }),
      f.forEach(function (t) {
        Yt(i, function (n) {
          var e = n.type,
            r = n.pos;
          return "bounds" === e && r === t;
        }) >= 0 || i.push({ type: "bounds", pos: t });
      });
  }
  var qo = {
      name: "snappable",
      props: {
        snappable: [Boolean, Array],
        snapCenter: Boolean,
        snapHorizontal: Boolean,
        snapVertical: Boolean,
        snapElement: Boolean,
        snapGap: Boolean,
        isDisplaySnapDigit: Boolean,
        snapDigit: Number,
        snapThreshold: Number,
        horizontalGuidelines: Array,
        verticalGuidelines: Array,
        elementGuidelines: Array,
        bounds: Object,
        innerBounds: Object,
        snapDistFormat: Function,
      },
      events: { onSnap: "snap" },
      css: [
        ":host {\n    --bounds-color: #d66;\n}\n.guideline {\n    pointer-events: none;\n    z-index: 2;\n}\n.guideline.bounds {\n    background: #d66;\n    background: var(--bounds-color);\n}\n.guideline-group {\n    position: absolute;\n    top: 0;\n    left: 0;\n}\n.guideline-group .size-value {\n    position: absolute;\n    color: #f55;\n    font-size: 12px;\n    font-weight: bold;\n}\n.guideline-group.horizontal .size-value {\n    transform-origin: 50% 100%;\n    transform: translateX(-50%);\n    left: 50%;\n    bottom: 5px;\n}\n.guideline-group.vertical .size-value {\n    transform-origin: 0% 50%;\n    top: 50%;\n    transform: translateY(-50%);\n    left: 5px;\n}\n.guideline.gap {\n    background: #f55;\n}\n.size-value.gap {\n    color: #f55;\n}\n",
      ],
      render: function (t, n) {
        var e = t.state,
          r = e.top,
          i = e.left,
          o = e.pos1,
          a = e.pos2,
          s = e.pos3,
          u = e.pos4,
          l = e.snapRenderInfo,
          c = e.targetClientRect,
          f = e.containerClientRect,
          p = e.is3d,
          d = e.rootMatrix;
        if (!l || !Eo(t, "")) return [];
        var h = p ? 4 : 3,
          g = Math.min(o[0], a[0], s[0], u[0]),
          v = Math.min(o[1], a[1], s[1], u[1]),
          m = qi(d, f, h),
          b = ai(d, [c.left - m[0], c.top - m[1]], h),
          x = b[0],
          y = b[1],
          E = t.props,
          S = E.snapThreshold,
          w = void 0 === S ? 5 : S,
          M = E.snapDigit,
          C = void 0 === M ? 0 : M,
          D = E.snapDistFormat,
          R =
            void 0 === D
              ? function (t) {
                  return t;
                }
              : D,
          O = l.externalPoses || [],
          P = Wr(t.state),
          z = [],
          G = [],
          B = [],
          T = [],
          _ = [],
          k = _r(P),
          A = k.width,
          I = k.height,
          j = k.top,
          N = k.left,
          F = k.bottom,
          Y = k.right,
          X = O.length > 0,
          $ = X ? _r(O) : {};
        if (!l.request) {
          if (
            (l.direction &&
              _.push(
                (function (t, n, e) {
                  var r = [];
                  if (e[0] && e[1])
                    r = [e, [-e[0], e[1]], [e[0], -e[1]]].map(function (t) {
                      return Bi(n, t);
                    });
                  else if (e[0] || e[1])
                    t.props.keepRatio
                      ? (r = [[-1, -1], [-1, 1], [1, -1], [1, 1], e].map(
                          function (t) {
                            return Bi(n, t);
                          }
                        ))
                      : (r = Gi(n, e)).length > 1 &&
                        r.push([
                          (r[0][0] + r[1][0]) / 2,
                          (r[0][1] + r[1][1]) / 2,
                        ]);
                  else
                    for (
                      var i = [n[0], n[1], n[3], n[2], n[0]], o = 0;
                      o < 4;
                      ++o
                    )
                      r.push(i[o]),
                        r.push([
                          (i[o][0] + i[o + 1][0]) / 2,
                          (i[o][1] + i[o + 1][1]) / 2,
                        ]);
                  return Ki(
                    t,
                    r.map(function (t) {
                      return t[0];
                    }),
                    r.map(function (t) {
                      return t[1];
                    }),
                    !0,
                    1
                  );
                })(t, P, l.direction)
              ),
            l.snap)
          ) {
            var L = _r(P);
            l.center &&
              ((L.middle = (L.top + L.bottom) / 2),
              (L.center = (L.left + L.right) / 2)),
              _.push(Qi(t, L, !0, 1));
          }
          X &&
            (l.center &&
              (($.middle = ($.top + $.bottom) / 2),
              ($.center = ($.left + $.right) / 2)),
            _.push(Qi(t, $, !0, 1))),
            _.forEach(function (t) {
              var n = t.vertical.posInfos,
                e = t.horizontal.posInfos;
              z.push.apply(
                z,
                n.map(function (t) {
                  return { type: "snap", pos: t.pos };
                })
              ),
                G.push.apply(
                  G,
                  e.map(function (t) {
                    return { type: "snap", pos: t.pos };
                  })
                ),
                B.push.apply(B, Ao(n)),
                T.push.apply(T, Ao(e));
            });
        }
        Lo(t, [N, Y], [j, F], z, G),
          X &&
            Lo(t, [$.left, $.right], [$.top, $.bottom], z, G, l.externalBounds);
        var q = jo(T, x, A, 0),
          V = jo(B, y, I, 1),
          W = Xo(B, "vertical", [i, r], [A, I]),
          H = Xo(T, "horizontal", [i, r], [A, I]),
          U = er(B, T);
        return (
          Qr(
            t,
            "onSnap",
            {
              guidelines: U.filter(function (t) {
                return !t.element;
              }),
              elements: ri(
                U.filter(function (t) {
                  return t.element;
                }),
                function (t) {
                  return t.element;
                }
              ),
              gaps: er(H, W),
            },
            !0
          ),
          er(
            $o(t, "vertical", H, R, n),
            $o(t, "horizontal", W, R, n),
            No(t, "horizontal", q, g, x, A, r, w, C, 0, R, n),
            No(t, "vertical", V, v, y, I, i, w, C, 1, R, n),
            Fo(t, "horizontal", G, g, r, A, 0, n),
            Fo(t, "vertical", z, v, i, I, 1, n),
            Yo(t, "horizontal", T, [i, r], n),
            Yo(t, "vertical", B, [i, r], n)
          )
        );
      },
      dragStart: function (t, n) {
        (t.state.snapRenderInfo = {
          request: n.isRequest,
          snap: !0,
          center: !0,
        }),
          yo(t);
      },
      drag: function (t) {
        var n = t.state;
        (n.staticGuidelines = Ui(t, !1, n.staticGuidelines)),
          (n.guidelines = Zi(t));
      },
      pinchStart: function (t) {
        this.unset(t);
      },
      dragEnd: function (t) {
        this.unset(t);
      },
      dragControlCondition: function (t, n) {
        return (
          !(!fi(t) && !na(t, n)) ||
          (!t.isRequest && t.inputEvent
            ? Kt(t.inputEvent.target, xr("snap-control"))
            : void 0)
        );
      },
      dragControlStart: function (t) {
        (t.state.snapRenderInfo = null), yo(t);
      },
      dragControl: function (t) {
        this.drag(t);
      },
      dragControlEnd: function (t) {
        this.unset(t);
      },
      dragGroupStart: function (t, n) {
        this.dragStart(t, n);
      },
      dragGroup: function (t) {
        this.drag(t);
      },
      dragGroupEnd: function (t) {
        this.unset(t);
      },
      dragGroupControlStart: function (t) {
        (t.state.snapRenderInfo = null), yo(t);
      },
      dragGroupControl: function (t) {
        this.drag(t);
      },
      dragGroupControlEnd: function (t) {
        this.unset(t);
      },
      unset: function (t) {
        var n = t.state;
        (n.enableSnap = !1),
          (n.staticGuidelines = []),
          (n.guidelines = []),
          (n.snapRenderInfo = null);
      },
    },
    Vo = {
      name: "draggable",
      props: {
        draggable: Boolean,
        throttleDrag: Number,
        throttleDragRotate: Number,
        startDragRotate: Number,
        edgeDraggable: Boolean,
      },
      events: {
        onDragStart: "dragStart",
        onDrag: "drag",
        onDragEnd: "dragEnd",
        onDragGroupStart: "dragGroupStart",
        onDragGroup: "dragGroup",
        onDragGroupEnd: "dragGroupEnd",
      },
      render: function (t, n) {
        var e = t.props,
          r = e.throttleDragRotate,
          i = e.zoom,
          o = t.state,
          a = o.dragInfo,
          s = o.beforeOrigin;
        if (!r || !a) return [];
        var u = a.dist;
        if (!u[0] && !u[1]) return [];
        var l = Ir(u),
          c = Ht(u, [0, 0]);
        return [
          n.createElement("div", {
            className: xr("line", "horizontal", "dragline", "dashed"),
            key: "dragRotateGuideline",
            style: {
              width: l + "px",
              transform:
                "translate(" +
                s[0] +
                "px, " +
                s[1] +
                "px) rotate(" +
                c +
                "rad) scaleY(" +
                i +
                ")",
            },
          }),
        ];
      },
      dragStart: function (t, n) {
        var e = n.datas,
          r = n.parentEvent,
          i = n.parentGesto,
          o = t.state,
          a = o.target;
        if (o.gesto) return !1;
        o.gesto = i || t.targetGesto;
        var s = window.getComputedStyle(a);
        (e.datas = {}),
          (e.left = parseFloat(s.left || "") || 0),
          (e.top = parseFloat(s.top || "") || 0),
          (e.bottom = parseFloat(s.bottom || "") || 0),
          (e.right = parseFloat(s.right || "") || 0),
          (e.startValue = [0, 0]),
          wi(t, n),
          Ai(n),
          (function (t, n) {
            n.absolutePoses = Wr(t.state);
          })(t, e),
          (e.prevDist = [0, 0]),
          (e.prevBeforeDist = [0, 0]),
          (e.isDrag = !1);
        var u = Kr(
          t,
          n,
          nr(
            {
              set: function (t) {
                e.startValue = t;
              },
            },
            ki(n)
          )
        );
        return (
          !1 !== (r || Qr(t, "onDragStart", u))
            ? ((e.isDrag = !0),
              (t.state.dragInfo = { startRect: t.getRect(), dist: [0, 0] }))
            : ((o.gesto = null), (e.isPinch = !1)),
          !!e.isDrag && u
        );
      },
      drag: function (t, n) {
        Mi(n, "translate");
        var e = n.datas,
          r = n.parentEvent,
          i = n.parentFlag,
          o = n.isPinch,
          a = n.isRequest,
          s = n.distX,
          u = n.distY,
          l = e.isDrag,
          c = e.prevDist,
          f = e.prevBeforeDist,
          p = e.startValue;
        if (l) {
          var d = t.props,
            h = d.parentMoveable,
            g = r ? 0 : d.throttleDrag || 0,
            v = r ? 0 : d.throttleDragRotate || 0,
            m = !1,
            b = 0;
          if (!r && v > 0 && (s || u)) {
            var x = d.startDragRotate || 0,
              y = Hr(x + (180 * Ht([0, 0], [s, u])) / Math.PI, v) - x,
              E = u * Math.abs(Math.cos(((y - 90) / 180) * Math.PI)),
              S = Ir([s * Math.abs(Math.cos((y / 180) * Math.PI)), E]);
            (b = (y * Math.PI) / 180),
              (s = S * Math.cos(b)),
              (u = S * Math.sin(b));
          }
          if (!o && !r && !i && (!v || s || u)) {
            var w = ko(t, s, u, v, a, e),
              M = w[0],
              C = w[1],
              D = M.isSnap,
              R = M.isBound,
              O = M.offset,
              P = C.isSnap,
              z = C.isBound;
            (m = D || P || R || z), (s += O), (u += C.offset);
          }
          (e.passDeltaX = s - (e.passDistX || 0)),
            (e.passDeltaY = u - (e.passDistY || 0)),
            (e.passDistX = s),
            (e.passDistY = u);
          var G = Jn(Oi({ datas: e, distX: s, distY: u }), p),
            B = Jn(Di({ datas: e, distX: s, distY: u }), p);
          v || m || (Ur(B, g), Ur(G, g));
          var T = Qn(G, p),
            _ = Qn(B, p),
            k = Qn(_, c),
            A = Qn(T, f);
          (e.prevDist = _), (e.prevBeforeDist = T);
          var I = e.left + T[0],
            j = e.top + T[1],
            N = e.right - T[0],
            F = e.bottom - T[1],
            Y = Ci(
              e,
              "translate(" + B[0] + "px, " + B[1] + "px)",
              "translate(" + _[0] + "px, " + _[1] + "px)"
            );
          if (
            ((t.state.dragInfo.dist = r ? [0, 0] : _),
            r ||
              h ||
              !k.every(function (t) {
                return !t;
              }) ||
              !A.some(function (t) {
                return !t;
              }))
          ) {
            var X = t.state,
              $ = Kr(t, n, {
                transform: Y,
                dist: _,
                delta: k,
                translate: B,
                beforeDist: T,
                beforeDelta: A,
                beforeTranslate: G,
                left: I,
                top: j,
                right: N,
                bottom: F,
                width: X.width,
                height: X.height,
                isPinch: o,
              });
            return !r && Qr(t, "onDrag", $), $;
          }
        }
      },
      dragEnd: function (t, n) {
        var e = n.parentEvent,
          r = n.datas,
          i = n.isDrag;
        if (((t.state.gesto = null), (t.state.dragInfo = null), r.isDrag))
          return (r.isDrag = !1), !e && Qr(t, "onDragEnd", Jr(t, n, {})), i;
      },
      dragGroupStart: function (t, n) {
        var e = n.datas,
          r = n.clientX,
          i = n.clientY,
          o = this.dragStart(t, n);
        if (!o) return !1;
        var a = yi(t, this, "dragStart", [r || 0, i || 0], n, !1),
          s = Qr(
            t,
            "onDragGroupStart",
            nr(nr({}, o), { targets: t.props.targets, events: a })
          );
        return (e.isDrag = !1 !== s), !!e.isDrag && o;
      },
      dragGroup: function (t, n) {
        if (n.datas.isDrag) {
          var e = this.drag(t, n),
            r = n.datas,
            i = yi(t, this, "drag", [r.passDeltaX, r.passDeltaY], n, !1);
          if (e) {
            var o = nr({ targets: t.props.targets, events: i }, e);
            return Qr(t, "onDragGroup", o), o;
          }
        }
      },
      dragGroupEnd: function (t, n) {
        var e = n.isDrag;
        if (n.datas.isDrag)
          return (
            this.dragEnd(t, n),
            yi(t, this, "dragEnd", [0, 0], n, !1),
            Qr(t, "onDragGroupEnd", Jr(t, n, { targets: t.props.targets })),
            e
          );
      },
      request: function (t) {
        var n = {},
          e = t.getRect(),
          r = 0,
          i = 0;
        return {
          isControl: !1,
          requestStart: function () {
            return { datas: n };
          },
          request: function (t) {
            return (
              "x" in t ? (r = t.x - e.left) : "deltaX" in t && (r += t.deltaX),
              "y" in t ? (i = t.y - e.top) : "deltaY" in t && (i += t.deltaY),
              { datas: n, distX: r, distY: i }
            );
          },
          requestEnd: function () {
            return { datas: n, isDrag: !0 };
          },
        };
      },
      unset: function (t) {
        t.state.dragInfo = null;
      },
    };
  function Wo(t, n, e) {
    var r = t.state,
      i = r.renderPoses,
      o = r.rotation,
      a = r.direction,
      s = t.props,
      u = s.renderDirections,
      l = void 0 === u ? n : u,
      c = s.zoom,
      f = {};
    if (!l) return [];
    var p = a > 0 ? 1 : -1,
      d = !0 === l ? gr : l,
      h = (o / Math.PI) * 180;
    return (
      d.forEach(function (t) {
        f[t] = !0;
      }),
      d.map(function (t) {
        var n = vr[t];
        if (!n || !f[t]) return null;
        var r = (Hr(h, 15) + p * mr[t] + 720) % 180;
        return e.createElement("div", {
          className: xr("control", "direction", t),
          "data-rotation": r,
          "data-direction": t,
          key: "direction-" + t,
          style: Fr.apply(
            void 0,
            er(
              [o, c],
              n.map(function (t) {
                return i[t];
              })
            )
          ),
        });
      })
    );
  }
  function Ho(t, n, e, r, i, o) {
    for (var a = [], s = 6; s < arguments.length; s++) a[s - 6] = arguments[s];
    var u = Ht(e, r),
      l = n ? Hr((u / Math.PI) * 180, 15) % 180 : -1;
    return t.createElement("div", {
      key: "line" + o,
      className: xr.apply(void 0, er(["line", "direction", n], a)),
      "data-rotation": l,
      "data-line-index": o,
      "data-direction": n,
      style: Nr(e, r, i, u),
    });
  }
  function Uo(t, n) {
    return Wo(t, gr, n);
  }
  function Zo(t, n) {
    return Wo(t, ["nw", "ne", "sw", "se"], n);
  }
  function Ko(t, n, e, r, i, o) {
    var a = t.state.is3d ? 4 : 3,
      s = Br(t.state.rootMatrix, i, a),
      u = Jn([o.left, o.top], s);
    (n.startAbsoluteOrigin = u),
      (n.prevDeg = (Ht(u, [e, r]) / Math.PI) * 180),
      (n.prevSnapDeg = n.prevDeg),
      (n.startDeg = n.prevDeg),
      (n.loop = 0);
  }
  function Jo(t, n, e, r, i, o) {
    var a = e.prevDeg,
      s = To(t, n, e.origin, r);
    return (e.prevDeg = s), [s - a, s, o + s];
  }
  function Qo(t, n, e, r, i, o, a, s) {
    var u = e.prevDeg,
      l = e.prevSnapDeg,
      c = e.startDeg,
      f = e.loop;
    u > r && u > 270 && r < 90
      ? ++e.loop
      : u < r && u < 90 && r > 270 && --e.loop;
    var p = e.loop,
      d = 360 * f + l - c + o,
      h = 360 * p + r - c + o;
    e.prevDeg = h - 360 * p + c - o;
    var g = i * ((h = Hr(h, a)) - o);
    return (
      s && (h = (g = To(t, n, e.origin, g)) / i + o),
      (e.prevSnapDeg = h - 360 * p + c - o),
      [i * (h - d), g, o + g]
    );
  }
  function ta(t, n, e, r, i, o, a, s) {
    return Qo(
      t,
      n,
      e,
      (Ht(e.startAbsoluteOrigin, [i, o]) / Math.PI) * 180,
      r,
      a,
      s,
      !0
    );
  }
  function na(t, n) {
    if (t.isRequest) return "rotatable" === t.requestAble;
    var e = t.inputEvent.target;
    if (Kt(e, xr("rotation-control"))) return !0;
    var r = n.props.rotationTarget;
    return (
      !!r &&
      hi(r, !0).some(function (t) {
        return !!t && (e === t || e.contains(t));
      })
    );
  }
  var ea = {
      name: "rotatable",
      canPinch: !0,
      props: {
        rotatable: Boolean,
        rotationPosition: String,
        throttleRotate: Number,
        renderDirections: Object,
        rotationTarget: Object,
      },
      events: {
        onRotateStart: "rotateStart",
        onRotate: "rotate",
        onRotateEnd: "rotateEnd",
        onRotateGroupStart: "rotateGroupStart",
        onRotateGroup: "rotateGroup",
        onRotateGroupEnd: "rotateGroupEnd",
      },
      css: [
        ".rotation {\n            position: absolute;\n            height: 40px;\n            width: 1px;\n            transform-origin: 50% 100%;\n            height: calc(40px * var(--zoom));\n            top: auto;\n            left: 0;\n            bottom: 100%;\n            will-change: transform;\n        }\n        .rotation .rotation-line {\n            display: block;\n            width: 100%;\n            height: 100%;\n            transform-origin: 50% 50%;\n        }\n        .rotation .rotation-control {\n            border-color: #4af;\n            border-color: var(--moveable-color);\n            background:#fff;\n            cursor: alias;\n        }",
      ],
      render: function (t, n) {
        var e = t.props,
          r = e.rotatable,
          i = e.rotationPosition,
          o = e.zoom,
          a = e.renderDirections,
          s = t.state,
          u = s.renderPoses,
          l = s.direction;
        if (!r) return null;
        var c = (function (t, n, e) {
            var r = n[0],
              i = n[1],
              o = n[2],
              a = n[3];
            if ("none" !== t) {
              var s = (t || "top").split("-"),
                u = s[0],
                l = s[1],
                c = [r, i];
              "left" === u
                ? (c = [o, r])
                : "right" === u
                ? (c = [i, a])
                : "bottom" === u && (c = [a, o]);
              var f = [(c[0][0] + c[1][0]) / 2, (c[0][1] + c[1][1]) / 2],
                p = Xr(c, e);
              if (l) {
                var d = "top" === l || "left" === l,
                  h = "bottom" === u || "left" === u;
                f = c[(d && !h) || (!d && h) ? 0 : 1];
              }
              return [f, p];
            }
          })(i, u, l),
          f = [];
        if (c) {
          var p = c[0],
            d = c[1];
          f.push(
            n.createElement(
              "div",
              {
                key: "rotation",
                className: xr("rotation"),
                style: {
                  transform:
                    "translate(-50%) translate(" +
                    p[0] +
                    "px, " +
                    p[1] +
                    "px) rotate(" +
                    d +
                    "rad)",
                },
              },
              n.createElement("div", {
                className: xr("line rotation-line"),
                style: { transform: "scaleX(" + o + ")" },
              }),
              n.createElement("div", {
                className: xr("control rotation-control"),
                style: { transform: "translate(0.5px) scale(" + o + ")" },
              })
            )
          );
        }
        return a && f.push.apply(f, Wo(t, [], n)), f;
      },
      dragControlCondition: na,
      dragControlStart: function (t, n) {
        var e = n.datas,
          r = n.clientX,
          i = n.clientY,
          o = n.parentRotate,
          a = n.parentFlag,
          s = n.isPinch,
          u = n.isRequest,
          l = t.state,
          c = l.target,
          f = l.left,
          p = l.top,
          d = l.origin,
          h = l.beforeOrigin,
          g = l.direction,
          v = l.beforeDirection,
          m = l.targetTransform,
          b = l.moveableClientRect;
        if (!u && !c) return !1;
        var x = t.getRect();
        if (
          ((e.rect = x),
          (e.transform = m),
          (e.left = f),
          (e.top = p),
          (e.fixedPosition = Xi(t, Yi(t))),
          (e.absoluteInfo = { origin: x.origin, startValue: x.rotation }),
          Ko(t, e.absoluteInfo, r, i, d, b),
          u || s || a)
        ) {
          var y = o || 0;
          (e.beforeInfo = {
            origin: x.beforeOrigin,
            prevDeg: y,
            startDeg: y,
            prevSnapDeg: y,
            loop: 0,
          }),
            (e.afterInfo = {
              origin: x.origin,
              prevDeg: y,
              startDeg: y,
              prevSnapDeg: y,
              loop: 0,
            });
        } else
          (e.beforeInfo = { origin: x.beforeOrigin }),
            (e.afterInfo = { origin: x.origin }),
            Ko(t, e.beforeInfo, r, i, h, b),
            Ko(t, e.afterInfo, r, i, d, b);
        (e.direction = g),
          (e.beforeDirection = v),
          (e.startValue = 0),
          (e.datas = {}),
          Ai(n);
        var E = Kr(
            t,
            n,
            nr(
              nr(
                {
                  set: function (t) {
                    e.startValue = (t * Math.PI) / 180;
                  },
                },
                ki(n)
              ),
              { dragStart: Vo.dragStart(t, new bi().dragStart([0, 0], n)) }
            )
          ),
          S = Qr(t, "onRotateStart", E);
        return (
          (e.isRotate = !1 !== S),
          (t.state.snapRenderInfo = { request: n.isRequest }),
          !!e.isRotate && E
        );
      },
      dragControl: function (t, n) {
        var e,
          r,
          i,
          o,
          a,
          s,
          u,
          l,
          c,
          f = n.datas,
          p = n.clientX,
          d = n.clientY,
          h = n.parentRotate,
          g = n.parentFlag,
          v = n.isPinch,
          m = n.groupDelta,
          b = f.beforeDirection,
          x = f.beforeInfo,
          y = f.afterInfo,
          E = f.absoluteInfo,
          S = f.isRotate,
          w = f.startValue,
          M = f.rect;
        if (S) {
          Mi(n, "rotate");
          var C,
            D,
            R,
            O,
            P,
            z,
            G,
            B,
            T,
            _ =
              b *
              (function (t) {
                return Ar(t.datas.beforeTransform, [50, 50], 100, 100)
                  .direction;
              })(n),
            k = t.props,
            A = k.throttleRotate,
            I = void 0 === A ? 0 : A,
            j = k.parentMoveable,
            N = (180 / Math.PI) * w,
            F = E.startValue;
          if (!g && "parentDist" in n) {
            var Y = n.parentDist;
            (C = (e = Jo(t, M, y, Y, 0, N))[0]),
              (D = e[1]),
              (R = e[2]),
              (O = (r = Jo(t, M, x, Y, 0, N))[0]),
              (P = r[1]),
              (z = r[2]),
              (G = (i = Jo(t, M, E, Y, 0, F))[0]),
              (B = i[1]),
              (T = i[2]);
          } else
            v || g
              ? ((C = (o = Qo(t, M, y, h, _, N, I))[0]),
                (D = o[1]),
                (R = o[2]),
                (O = (a = Qo(t, M, x, h, b, N, I))[0]),
                (P = a[1]),
                (z = a[2]),
                (G = (s = Qo(t, M, E, h, _, F, I))[0]),
                (B = s[1]),
                (T = s[2]))
              : ((C = (u = ta(t, M, y, _, p, d, N, I))[0]),
                (D = u[1]),
                (R = u[2]),
                (O = (l = ta(t, M, x, b, p, d, N, I))[0]),
                (P = l[1]),
                (z = l[2]),
                (G = (c = ta(t, M, E, _, p, d, F, I))[0]),
                (B = c[1]),
                (T = c[2]));
          if (G || C || O || j) {
            var X = Ci(f, "rotate(" + R + "deg)", "rotate(" + D + "deg)"),
              $ = (function (t, n, e, r) {
                return Fi(t, "rotate(" + n + "deg)", Yi(t), e, r);
              })(t, D, f.fixedPosition, f),
              L = Qn(Jn(m || [0, 0], $), f.prevInverseDist || [0, 0]);
            f.prevInverseDist = $;
            var q = Kr(
              t,
              n,
              nr(
                {
                  delta: C,
                  dist: D,
                  rotate: R,
                  beforeDist: P,
                  beforeDelta: O,
                  beforeRotate: z,
                  absoluteDist: B,
                  absoluteDelta: G,
                  absoluteRotate: T,
                  isPinch: !!v,
                },
                Ni(t, X, L, v, n)
              )
            );
            return Qr(t, "onRotate", q), q;
          }
        }
      },
      dragControlEnd: function (t, n) {
        var e = n.datas,
          r = n.isDrag;
        return (
          !!e.isRotate &&
          ((e.isRotate = !1), Qr(t, "onRotateEnd", Jr(t, n, {})), r)
        );
      },
      dragGroupControlCondition: na,
      dragGroupControlStart: function (t, n) {
        var e = n.datas,
          r = t.state,
          i = r.left,
          o = r.top,
          a = r.beforeOrigin,
          s = this.dragControlStart(t, n);
        if (!s) return !1;
        s.set(e.beforeDirection * t.rotation);
        var u = Ei(t, this, "dragControlStart", n, function (t, n) {
            var e = t.state,
              r = e.left,
              s = e.top,
              u = e.beforeOrigin,
              l = Jn(Qn([r, s], [i, o]), Qn(u, a));
            return (
              (n.datas.groupClient = l), nr(nr({}, n), { parentRotate: 0 })
            );
          }),
          l = Qr(
            t,
            "onRotateGroupStart",
            nr(nr({}, s), { targets: t.props.targets, events: u })
          );
        return (e.isRotate = !1 !== l), !!e.isRotate && s;
      },
      dragGroupControl: function (t, n) {
        var e = n.datas;
        if (e.isRotate) {
          var r = this.dragControl(t, n);
          if (r) {
            var i = e.beforeDirection,
              o = r.beforeDist,
              a = (r.beforeDelta / 180) * Math.PI,
              s = Ei(t, this, "dragControl", n, function (t, n) {
                var e = n.datas.groupClient,
                  r = e[0],
                  s = e[1],
                  u = ae([r, s], a * i),
                  l = u[0],
                  c = u[1],
                  f = [l - r, c - s];
                return (
                  (n.datas.groupClient = [l, c]),
                  nr(nr({}, n), { parentRotate: o, groupDelta: f })
                );
              });
            t.rotation = i * r.beforeRotate;
            var u = nr(
              {
                targets: t.props.targets,
                events: s,
                set: function (n) {
                  t.rotation = n;
                },
              },
              r
            );
            return Qr(t, "onRotateGroup", u), u;
          }
        }
      },
      dragGroupControlEnd: function (t, n) {
        var e = n.isDrag;
        if (n.datas.isRotate)
          return (
            this.dragControlEnd(t, n),
            Ei(t, this, "dragControlEnd", n),
            Qr(t, "onRotateGroupEnd", Jr(t, n, { targets: t.props.targets })),
            e
          );
      },
      request: function (t) {
        var n = {},
          e = 0,
          r = t.getRotation();
        return {
          isControl: !0,
          requestStart: function () {
            return { datas: n };
          },
          request: function (t) {
            return (
              "deltaRotate" in t
                ? (e += t.deltaRotate)
                : "rotate" in t && (e = t.rotate - r),
              { datas: n, parentDist: e }
            );
          },
          requestEnd: function () {
            return { datas: n, isDrag: !0 };
          },
        };
      },
    },
    ra = {
      name: "resizable",
      ableGroup: "size",
      updateRect: !0,
      canPinch: !0,
      props: {
        resizable: Boolean,
        throttleResize: Number,
        renderDirections: Array,
        keepRatio: Boolean,
      },
      events: {
        onResizeStart: "resizeStart",
        onResize: "resize",
        onResizeEnd: "resizeEnd",
        onResizeGroupStart: "resizeGroupStart",
        onResizeGroup: "resizeGroup",
        onResizeGroupEnd: "resizeGroupEnd",
      },
      render: function (t, n) {
        var e = t.props,
          r = e.resizable,
          i = e.edge;
        if (r) return i ? Zo(t, n) : Uo(t, n);
      },
      dragControlCondition: fi,
      dragControlStart: function (t, n) {
        var e,
          r = n.inputEvent,
          i = n.isPinch,
          o = n.parentDirection,
          a = n.datas,
          s = n.parentFlag,
          u = o || (i ? [0, 0] : qr(r.target)),
          l = t.state,
          c = l.target,
          f = l.width,
          p = l.height;
        if (!u || !c) return !1;
        !i && wi(t, n),
          (a.datas = {}),
          (a.direction = u),
          (a.startOffsetWidth = f),
          (a.startOffsetHeight = p),
          (a.prevWidth = 0),
          (a.prevHeight = 0),
          (e = (function (t) {
            var n = window.getComputedStyle(t);
            return [parseFloat(n.width), parseFloat(n.height)];
          })(c)),
          (a.startWidth = e[0]),
          (a.startHeight = e[1]);
        var d = [Math.max(0, f - a.startWidth), Math.max(0, p - a.startHeight)];
        if (((a.minSize = d), (a.maxSize = [1 / 0, 1 / 0]), !s)) {
          var h = window.getComputedStyle(c),
            g = h.position,
            v = h.minWidth,
            m = h.minHeight,
            b = h.maxWidth,
            x = h.maxHeight,
            y = "static" === g || "relative" === g,
            E = y ? c.parentElement : c.offsetParent,
            S = f,
            w = p;
          if (E && ((S = E.clientWidth), (w = E.clientHeight), y)) {
            var M = window.getComputedStyle(E);
            (S -= parseFloat(M.paddingLeft) || 0),
              (w -= parseFloat(M.paddingTop) || 0);
          }
          (a.minSize = Jn([$t(v, S) || 0, $t(m, w) || 0], d)),
            (a.maxSize = Jn([$t(b, S) || 1 / 0, $t(x, w) || 1 / 0], d));
        }
        var C = t.props.transformOrigin || "% %";
        function D(t) {
          a.ratio = t && isFinite(t) ? t : 0;
        }
        function R(n) {
          (a.fixedDirection = n), (a.fixedPosition = Li(t, n));
        }
        (a.transformOrigin = C && zt(C) ? C.split(" ") : C),
          (a.isWidth = (!u[0] && !u[1]) || u[0] || !u[1]),
          D(f / p),
          R([-u[0], -u[1]]);
        var O = Kr(t, n, {
          direction: u,
          set: function (t) {
            var n = t[0],
              e = t[1];
            (a.startWidth = n), (a.startHeight = e);
          },
          setMin: function (t) {
            a.minSize = t;
          },
          setMax: function (t) {
            a.maxSize = [t[0] || 1 / 0, t[1] || 1 / 0];
          },
          setRatio: D,
          setFixedDirection: R,
          setOrigin: function (t) {
            a.transformOrigin = t;
          },
          dragStart: Vo.dragStart(t, new bi().dragStart([0, 0], n)),
        });
        return (
          !1 !== Qr(t, "onResizeStart", O) &&
            ((a.isResize = !0),
            (t.state.snapRenderInfo = { request: n.isRequest, direction: u })),
          !!a.isResize && O
        );
      },
      dragControl: function (t, n) {
        var e,
          r = n.datas,
          i = n.distX,
          o = n.distY,
          a = n.parentFlag,
          s = n.isPinch,
          u = n.parentDistance,
          l = n.parentScale,
          c = n.parentKeepRatio,
          f = n.dragClient,
          p = n.parentDist,
          d = n.isRequest,
          h = r.isResize,
          g = r.transformOrigin,
          v = r.fixedDirection,
          m = r.startWidth,
          b = r.startHeight,
          x = r.prevWidth,
          y = r.prevHeight,
          E = r.minSize,
          S = r.maxSize,
          w = r.ratio,
          M = r.isWidth,
          C = r.startOffsetWidth,
          D = r.startOffsetHeight;
        if (h) {
          var R = t.props,
            O = R.throttleResize,
            P = void 0 === O ? 0 : O,
            z = R.parentMoveable,
            G = R.snapThreshold,
            B = void 0 === G ? 5 : G,
            T = r.direction,
            _ = T,
            k = 0,
            A = 0;
          T[0] || T[1] || (_ = [1, 1]);
          var I = w && (t.props.keepRatio || c),
            j = f;
          if ((f || (j = !a && s ? Li(t, [0, 0]) : r.fixedPosition), p))
            (k = p[0]), (A = p[1]), I && (k ? A || (A = k / w) : (k = A * w));
          else if (l) (k = (l[0] - 1) * C), (A = (l[1] - 1) * D);
          else if (s) u && ((k = u), (A = (u * D) / C));
          else {
            var N = Pi({ datas: r, distX: i, distY: o });
            if (((k = _[0] * N[0]), (A = _[1] * N[1]), I && C && D)) {
              var F = Ht([0, 0], N),
                Y = Ht([0, 0], _),
                X = Ir([k, A]),
                $ = Math.cos(F - Y) * X;
              if (_[0])
                if (_[1]) {
                  var L = 2 * _[0] * C,
                    q = 2 * _[1] * D,
                    V = Ir([L + N[0], q + N[1]]) - Ir([L, q]),
                    W = Ht([0, 0], [w, 1]);
                  (k = Math.cos(W) * V), (A = Math.sin(W) * V);
                } else A = (k = $) * w;
              else k = (A = $) / w;
            } else if (!I) {
              var H = er(T);
              C || (N[0] < 0 ? (H[0] = -1) : N[0] > 0 && (H[0] = 1)),
                D || (N[1] < 0 ? (H[1] = -1) : N[1] > 0 && (H[1] = 1)),
                (T = H),
                (k = (_ = H)[0] * N[0]),
                (A = _[1] * N[1]);
            }
          }
          var U = _[0] || I ? Math.max(C + k, fr) : C,
            Z = _[1] || I ? Math.max(D + A, fr) : D;
          I && C && D && (M ? (Z = U / w) : (U = Z * w));
          var K = [0, 0];
          if (
            (s ||
              (K = (function (t, n, e, r, i, o, a) {
                if (!Eo(t, "resizable")) return [0, 0];
                var s = t.state,
                  u = s.allMatrix,
                  l = s.is3d;
                return Bo(
                  t,
                  function (t, o) {
                    return wo(u, n + t, e + o, i, r, l);
                  },
                  n,
                  e,
                  r,
                  i,
                  o,
                  a
                );
              })(t, U, Z, T, j, d, r)),
            p && (!p[0] && (K[0] = 0), !p[1] && (K[1] = 0)),
            I)
          ) {
            _[0] &&
              _[1] &&
              K[0] &&
              K[1] &&
              (Math.abs(K[0]) > Math.abs(K[1]) ? (K[1] = 0) : (K[0] = 0));
            var J = !K[0] && !K[1];
            J && (M ? (U = Hr(U, P)) : (Z = Hr(Z, P))),
              (_[0] && !_[1]) || (K[0] && !K[1]) || (J && M)
                ? (Z = (U += K[0]) / w)
                : ((!_[0] && _[1]) || (!K[0] && K[1]) || (J && !M)) &&
                  (U = (Z += K[1]) * w);
          } else
            C + k < -B && (K[0] = 0),
              C + A < -B && (K[1] = 0),
              (U += K[0]),
              (Z += K[1]),
              K[0] || (U = Hr(U, P)),
              K[1] || (Z = Hr(Z, P));
          (U = (e = Vt([U, Z], E, S, I))[0]), (Z = e[1]);
          var Q = [
            (k = (U = Math.round(U)) - C) - x,
            (A = (Z = Math.round(Z)) - D) - y,
          ];
          (r.prevWidth = k), (r.prevHeight = A);
          var tt = $i(t, U, Z, v, j, g);
          if (
            z ||
            !Q.every(function (t) {
              return !t;
            }) ||
            !tt.every(function (t) {
              return !t;
            })
          ) {
            var nt = Kr(t, n, {
              width: m + k,
              height: b + A,
              offsetWidth: U,
              offsetHeight: Z,
              direction: T,
              dist: [k, A],
              delta: Q,
              isPinch: !!s,
              drag: Vo.drag(t, mi(n, t.state, tt, !!s, !1)),
            });
            return Qr(t, "onResize", nt), nt;
          }
        }
      },
      dragControlAfter: function (t, n) {
        var e = n.datas,
          r = e.isResize,
          i = e.startOffsetWidth,
          o = e.startOffsetHeight,
          a = e.prevWidth,
          s = e.prevHeight;
        if (r) {
          var u = t.state,
            l = u.width - (i + a),
            c = u.height - (o + s),
            f = Math.abs(l) > 3,
            p = Math.abs(c) > 3;
          return (
            f &&
              ((e.startWidth += l),
              (e.startOffsetWidth += l),
              (e.prevWidth += l)),
            p &&
              ((e.startHeight += c),
              (e.startOffsetHeight += c),
              (e.prevHeight += c)),
            f || p ? (this.dragControl(t, n), !0) : void 0
          );
        }
      },
      dragControlEnd: function (t, n) {
        var e = n.datas,
          r = n.isDrag;
        return (
          !!e.isResize &&
          ((e.isResize = !1), Qr(t, "onResizeEnd", Jr(t, n, {})), r)
        );
      },
      dragGroupControlCondition: fi,
      dragGroupControlStart: function (t, n) {
        var e = n.datas,
          r = this.dragControlStart(t, n);
        if (!r) return !1;
        var i = xi(t, "resizable", n);
        function o(n, r) {
          var i = e.fixedDirection,
            o = e.fixedPosition,
            a = Li(n, i),
            s = ne(
              le((-t.rotation / 180) * Math.PI, 3),
              [a[0] - o[0], a[1] - o[1], 1],
              3
            ),
            u = s[0],
            l = s[1];
          return (r.datas.originalX = u), (r.datas.originalY = l), r;
        }
        var a = Ei(t, this, "dragControlStart", n, function (t, n) {
            return o(t, n);
          }),
          s = nr(nr({}, r), {
            targets: t.props.targets,
            events: a,
            setFixedDirection: function (n) {
              r.setFixedDirection(n),
                a.forEach(function (e, r) {
                  e.setFixedDirection(n), o(t.moveables[r], i[r]);
                });
            },
          }),
          u = Qr(t, "onResizeGroupStart", s);
        return (e.isResize = !1 !== u), !!e.isResize && r;
      },
      dragGroupControl: function (t, n) {
        var e = n.datas;
        if (e.isResize) {
          var r = this.dragControl(t, n);
          if (r) {
            var i = r.offsetWidth,
              o = r.offsetHeight,
              a = r.dist,
              s = t.props.keepRatio,
              u = [i / (i - a[0]), o / (o - a[1])],
              l = e.fixedPosition,
              c = Ei(t, this, "dragControl", n, function (n, e) {
                var r = ne(
                    le((t.rotation / 180) * Math.PI, 3),
                    [e.datas.originalX * u[0], e.datas.originalY * u[1], 1],
                    3
                  ),
                  i = r[0],
                  o = r[1];
                return nr(nr({}, e), {
                  parentDist: null,
                  parentScale: u,
                  dragClient: Jn(l, [i, o]),
                  parentKeepRatio: s,
                });
              }),
              f = nr({ targets: t.props.targets, events: c }, r);
            return Qr(t, "onResizeGroup", f), f;
          }
        }
      },
      dragGroupControlEnd: function (t, n) {
        var e = n.isDrag;
        if (n.datas.isResize)
          return (
            this.dragControlEnd(t, n),
            Ei(t, this, "dragControlEnd", n),
            Qr(t, "onResizeGroupEnd", Jr(t, n, { targets: t.props.targets })),
            e
          );
      },
      request: function (t) {
        var n = {},
          e = 0,
          r = 0,
          i = t.getRect();
        return {
          isControl: !0,
          requestStart: function (t) {
            return { datas: n, parentDirection: t.direction || [1, 1] };
          },
          request: function (t) {
            return (
              "offsetWidth" in t
                ? (e = t.offsetWidth - i.offsetWidth)
                : "deltaWidth" in t && (e += t.deltaWidth),
              "offsetHeight" in t
                ? (r = t.offsetHeight - i.offsetHeight)
                : "deltaHeight" in t && (r += t.deltaHeight),
              { datas: n, parentDist: [e, r] }
            );
          },
          requestEnd: function () {
            return { datas: n, isDrag: !0 };
          },
        };
      },
    },
    ia = {
      name: "scalable",
      ableGroup: "size",
      canPinch: !0,
      props: {
        scalable: Boolean,
        throttleScale: Number,
        renderDirections: String,
        keepRatio: Boolean,
      },
      events: {
        onScaleStart: "scaleStart",
        onScale: "scale",
        onScaleEnd: "scaleEnd",
        onScaleGroupStart: "scaleGroupStart",
        onScaleGroup: "scaleGroup",
        onScaleGroupEnd: "scaleGroupEnd",
      },
      render: function (t, n) {
        var e = t.props,
          r = e.resizable,
          i = e.scalable,
          o = e.edge;
        if (!r && i) return o ? Zo(t, n) : Uo(t, n);
      },
      dragControlCondition: fi,
      dragControlStart: function (t, n) {
        var e = n.datas,
          r = n.isPinch,
          i = n.inputEvent,
          o = n.parentDirection || (r ? [0, 0] : qr(i.target)),
          a = t.state,
          s = a.width,
          u = a.height,
          l = a.targetTransform,
          c = a.target,
          f = a.pos1,
          p = a.pos2,
          d = a.pos4;
        if (!o || !c) return !1;
        r || wi(t, n),
          Ai(n),
          (e.datas = {}),
          (e.transform = l),
          (e.prevDist = [1, 1]),
          (e.direction = o),
          (e.width = s),
          (e.height = u),
          (e.startValue = [1, 1]);
        var h = (!o[0] && !o[1]) || o[0] || !o[1];
        function g(t) {
          e.ratio = t && isFinite(t) ? t : 0;
        }
        function v(n) {
          (e.fixedDirection = n), (e.fixedPosition = Li(t, n));
        }
        (e.isWidth = h), g(Zt(f, p) / Zt(p, d)), v([-o[0], -o[1]]);
        var m = Kr(
          t,
          n,
          nr(
            nr(
              {
                direction: o,
                set: function (t) {
                  e.startValue = t;
                },
                setRatio: g,
                setFixedDirection: v,
              },
              ki(n)
            ),
            { dragStart: Vo.dragStart(t, new bi().dragStart([0, 0], n)) }
          )
        );
        return (
          !1 !== Qr(t, "onScaleStart", m) &&
            ((e.isScale = !0),
            (t.state.snapRenderInfo = { request: n.isRequest, direction: o })),
          !!e.isScale && m
        );
      },
      dragControl: function (t, n) {
        Mi(n, "scale");
        var e = n.datas,
          r = n.distX,
          i = n.distY,
          o = n.parentScale,
          a = n.parentDistance,
          s = n.parentKeepRatio,
          u = n.parentFlag,
          l = n.isPinch,
          c = n.dragClient,
          f = n.parentDist,
          p = n.isRequest,
          d = e.prevDist,
          h = e.direction,
          g = e.width,
          v = e.height,
          m = e.isScale,
          b = e.startValue,
          x = e.isWidth,
          y = e.ratio,
          E = e.fixedDirection;
        if (!m) return !1;
        var S = t.props,
          w = S.throttleScale,
          M = S.parentMoveable,
          C = h;
        h[0] || h[1] || (C = [1, 1]);
        var D = y && (t.props.keepRatio || s),
          R = t.state,
          O = 1,
          P = 1,
          z = c;
        if ((c || (z = !u && l ? Li(t, [0, 0]) : e.fixedPosition), f))
          (O = (g + f[0]) / g), (P = (v + f[1]) / v);
        else if (o) (O = o[0]), (P = o[1]);
        else if (l) a && ((O = (g + a) / g), (P = (v + (a * v) / g) / v));
        else {
          var G = Pi({ datas: e, distX: r, distY: i }),
            B = C[0] * G[0],
            T = C[1] * G[1];
          if (D && g && v) {
            var _ = Ht([0, 0], G),
              k = Ht([0, 0], C),
              A = Ir([B, T]),
              I = Math.cos(_ - k) * A;
            C[0] ? (T = C[1] ? B * y : (B = I) * y) : (B = (T = I) / y);
          }
          (O = (g + B) / g), (P = (v + T) / v);
        }
        (O = C[0] || D ? O * b[0] : b[0]),
          (P = C[1] || D ? P * b[1] : b[1]),
          0 === O && (O = (d[0] > 0 ? 1 : -1) * pr),
          0 === P && (P = (d[1] > 0 ? 1 : -1) * pr);
        var j = [O / b[0], P / b[1]],
          N = [O, P];
        if (!l && t.props.groupable) {
          var F = (R.snapRenderInfo || {}).direction;
          Pt(F) &&
            (F[0] || F[1]) &&
            (R.snapRenderInfo = { direction: h, request: n.isRequest });
        }
        var Y = [0, 0];
        if ((l || (Y = _o(t, j, h, p, e)), D)) {
          C[0] &&
            C[1] &&
            Y[0] &&
            Y[1] &&
            (Math.abs(Y[0]) > Math.abs(Y[1]) ? (Y[1] = 0) : (Y[0] = 0));
          var X = !Y[0] && !Y[1];
          if (
            (X &&
              (x
                ? (j[0] = Hr(j[0] * b[0], w) / b[0])
                : (j[1] = Hr(j[1] * b[1], w) / b[1])),
            (C[0] && !C[1]) || (Y[0] && !Y[1]) || (X && x))
          ) {
            j[0] += Y[0];
            var $ = (g * j[0] * b[0]) / y;
            j[1] = $ / v / b[1];
          } else if ((!C[0] && C[1]) || (!Y[0] && Y[1]) || (X && !x)) {
            j[1] += Y[1];
            var L = v * j[1] * b[1] * y;
            j[0] = L / g / b[0];
          }
        } else
          (j[0] += Y[0]),
            (j[1] += Y[1]),
            Y[0] || (j[0] = Hr(j[0] * b[0], w) / b[0]),
            Y[1] || (j[1] = Hr(j[1] * b[1], w) / b[1]);
        0 === j[0] && (j[0] = (d[0] > 0 ? 1 : -1) * pr),
          0 === j[1] && (j[1] = (d[1] > 0 ? 1 : -1) * pr);
        var q,
          V,
          W = [j[0] / d[0], j[1] / d[1]];
        (V = b), (N = [(q = j)[0] * V[0], q[1] * V[1]]);
        var H = (function (t, n, e, r, i) {
            return Fi(t, "scale(" + n.join(", ") + ")", e, r, i);
          })(t, j, E, z, e),
          U = Qn(H, e.prevInverseDist || [0, 0]);
        if (
          ((e.prevDist = j),
          (e.prevInverseDist = H),
          O === d[0] &&
            P === d[1] &&
            U.every(function (t) {
              return !t;
            }) &&
            !M)
        )
          return !1;
        var Z = Ci(
            e,
            "scale(" + N.join(", ") + ")",
            "scale(" + j.join(", ") + ")"
          ),
          K = Kr(
            t,
            n,
            nr(
              {
                offsetWidth: g,
                offsetHeight: v,
                direction: h,
                scale: N,
                dist: j,
                delta: W,
                isPinch: !!l,
              },
              Ni(t, Z, U, l, n)
            )
          );
        return Qr(t, "onScale", K), K;
      },
      dragControlEnd: function (t, n) {
        var e = n.datas,
          r = n.isDrag;
        return (
          !!e.isScale &&
          ((e.isScale = !1), Qr(t, "onScaleEnd", Jr(t, n, {})), r)
        );
      },
      dragGroupControlCondition: fi,
      dragGroupControlStart: function (t, n) {
        var e = n.datas,
          r = this.dragControlStart(t, n);
        if (!r) return !1;
        var i = xi(t, "resizable", n);
        function o(n, r) {
          var i = e.fixedDirection,
            o = e.fixedPosition,
            a = Li(n, i),
            s = ne(
              le((-t.rotation / 180) * Math.PI, 3),
              [a[0] - o[0], a[1] - o[1], 1],
              3
            ),
            u = s[0],
            l = s[1];
          return (r.datas.originalX = u), (r.datas.originalY = l), r;
        }
        e.moveableScale = t.scale;
        var a = Ei(t, this, "dragControlStart", n, function (t, n) {
            return o(t, n);
          }),
          s = nr(nr({}, r), {
            targets: t.props.targets,
            events: a,
            setFixedDirection: function (n) {
              r.setFixedDirection(n),
                a.forEach(function (e, r) {
                  e.setFixedDirection(n), o(t.moveables[r], i[r]);
                });
            },
          }),
          u = Qr(t, "onScaleGroupStart", s);
        return (e.isScale = !1 !== u), !!e.isScale && s;
      },
      dragGroupControl: function (t, n) {
        var e = n.datas;
        if (e.isScale) {
          var r = this.dragControl(t, n);
          if (r) {
            var i = e.moveableScale;
            t.scale = [r.scale[0] * i[0], r.scale[1] * i[1]];
            var o = t.props.keepRatio,
              a = r.dist,
              s = r.scale,
              u = e.fixedPosition,
              l = Ei(t, this, "dragControl", n, function (n, e) {
                var r = ne(
                    le((t.rotation / 180) * Math.PI, 3),
                    [e.datas.originalX * a[0], e.datas.originalY * a[1], 1],
                    3
                  ),
                  i = r[0],
                  l = r[1];
                return nr(nr({}, e), {
                  parentDist: null,
                  parentScale: s,
                  parentKeepRatio: o,
                  dragClient: Jn(u, [i, l]),
                });
              }),
              c = nr({ targets: t.props.targets, events: l }, r);
            return Qr(t, "onScaleGroup", c), c;
          }
        }
      },
      dragGroupControlEnd: function (t, n) {
        var e = n.isDrag;
        if (n.datas.isScale)
          return (
            this.dragControlEnd(t, n),
            Ei(t, this, "dragControlEnd", n),
            Qr(t, "onScaleGroupEnd", Jr(t, n, { targets: t.props.targets })),
            e
          );
      },
      request: function () {
        var t = {},
          n = 0,
          e = 0;
        return {
          isControl: !0,
          requestStart: function (n) {
            return { datas: t, parentDirection: n.direction || [1, 1] };
          },
          request: function (r) {
            return (
              (n += r.deltaWidth),
              (e += r.deltaHeight),
              { datas: t, parentDist: [n, e] }
            );
          },
          requestEnd: function () {
            return { datas: t, isDrag: !0 };
          },
        };
      },
    };
  function oa(t, n) {
    return t.map(function (t, e) {
      return (r = t), (i = n[e]), (r * (a = 2) + i * (o = 1)) / (o + a);
      var r, i, o, a;
    });
  }
  function aa(t, n, e) {
    var r = Ht(t, n),
      i = Ht(t, e) - r;
    return i >= 0 ? i : i + 2 * Math.PI;
  }
  var sa = {
      name: "warpable",
      ableGroup: "size",
      props: { warpable: Boolean, renderDirections: Array },
      events: {
        onWarpStart: "warpStart",
        onWarp: "warp",
        onWarpEnd: "warpEnd",
      },
      render: function (t, n) {
        var e = t.props,
          r = e.resizable,
          i = e.scalable,
          o = e.warpable,
          a = e.zoom;
        if (r || i || !o) return [];
        var s = t.state,
          u = s.pos1,
          l = s.pos2,
          c = s.pos3,
          f = s.pos4,
          p = oa(u, l),
          d = oa(l, u),
          h = oa(u, c),
          g = oa(c, u),
          v = oa(c, f),
          m = oa(f, c),
          b = oa(l, f),
          x = oa(f, l);
        return er(
          [
            n.createElement("div", {
              className: xr("line"),
              key: "middeLine1",
              style: Nr(p, v, a),
            }),
            n.createElement("div", {
              className: xr("line"),
              key: "middeLine2",
              style: Nr(d, m, a),
            }),
            n.createElement("div", {
              className: xr("line"),
              key: "middeLine3",
              style: Nr(h, b, a),
            }),
            n.createElement("div", {
              className: xr("line"),
              key: "middeLine4",
              style: Nr(g, x, a),
            }),
          ],
          Uo(t, n)
        );
      },
      dragControlCondition: function (t) {
        return !t.isRequest && Kt(t.inputEvent.target, xr("direction"));
      },
      dragControlStart: function (t, n) {
        var e = n.datas,
          r = n.inputEvent,
          i = t.props.target,
          o = qr(r.target);
        if (!o || !i) return !1;
        var a = t.state,
          s = a.transformOrigin,
          u = a.is3d,
          l = a.targetTransform,
          c = a.targetMatrix,
          f = a.width,
          p = a.height,
          d = a.left,
          h = a.top;
        return (
          (e.datas = {}),
          (e.targetTransform = l),
          (e.warpTargetMatrix = u ? c : Un(c, 3, 4)),
          (e.targetInverseMatrix = Vn(Wn(e.warpTargetMatrix, 4), 3, 4)),
          (e.direction = o),
          (e.left = d),
          (e.top = h),
          wi(t, n),
          Ai(n),
          (e.poses = [
            [0, 0],
            [f, 0],
            [0, p],
            [f, p],
          ].map(function (t) {
            return Qn(t, s);
          })),
          (e.nextPoses = e.poses.map(function (t) {
            var n = t[0],
              r = t[1];
            return ne(e.warpTargetMatrix, [n, r, 0, 1], 4);
          })),
          (e.startValue = ce(4)),
          (e.prevMatrix = ce(4)),
          (e.absolutePoses = Wr(a)),
          (e.posIndexes = zi(o)),
          (a.snapRenderInfo = { request: n.isRequest, direction: o }),
          !1 !==
            Qr(
              t,
              "onWarpStart",
              Kr(
                t,
                n,
                nr(
                  {
                    set: function (t) {
                      e.startValue = t;
                    },
                  },
                  ki(n)
                )
              )
            ) && (e.isWarp = !0),
          e.isWarp
        );
      },
      dragControl: function (t, n) {
        var e = n.datas,
          r = n.isRequest,
          i = n.distX,
          o = n.distY,
          a = e.targetInverseMatrix,
          s = e.prevMatrix,
          u = e.isWarp,
          l = e.startValue,
          c = e.poses,
          f = e.posIndexes,
          p = e.absolutePoses;
        if (!u) return !1;
        if ((Mi(n, "matrix3d"), Eo(t, "warpable"))) {
          var d = f.map(function (t) {
            return p[t];
          });
          d.length > 1 &&
            d.push([(d[0][0] + d[1][0]) / 2, (d[0][1] + d[1][1]) / 2]);
          var h = Ro(
              t,
              r,
              d.map(function (t) {
                return [t[0] + i, t[1] + o];
              })
            ),
            g = h.horizontal,
            v = h.vertical;
          (o -= g.offset), (i -= v.offset);
        }
        var m = Pi({ datas: e, distX: i, distY: o }, !0),
          b = e.nextPoses.slice();
        if (
          (f.forEach(function (t) {
            b[t] = Jn(b[t], m);
          }),
          !cr.every(function (t) {
            return (
              (n = t.map(function (t) {
                return c[t];
              })),
              (e = t.map(function (t) {
                return b[t];
              })),
              (r = aa(n[0], n[1], n[2])),
              (i = aa(e[0], e[1], e[2])),
              (o = Math.PI),
              !((r >= o && i <= o) || (r <= o && i >= o))
            );
            var n, e, r, i, o;
          }))
        )
          return !1;
        var x = de(c[0], c[2], c[1], c[3], b[0], b[2], b[1], b[3]);
        if (!x.length) return !1;
        var y = Ri(e, Kn(a, x, 4), !0),
          E = Kn(Wn(s, 4), y, 4);
        e.prevMatrix = y;
        var S = Kn(l, y, 4),
          w = Ci(
            e,
            "matrix3d(" + S.join(", ") + ")",
            "matrix3d(" + y.join(", ") + ")"
          );
        return (
          ji(n, w),
          Qr(
            t,
            "onWarp",
            Kr(t, n, {
              delta: E,
              matrix: S,
              dist: y,
              multiply: Kn,
              transform: w,
            })
          ),
          !0
        );
      },
      dragControlEnd: function (t, n) {
        var e = n.datas,
          r = n.isDrag;
        return (
          !!e.isWarp && ((e.isWarp = !1), Qr(t, "onWarpEnd", Jr(t, n, {})), r)
        );
      },
    },
    ua = xr("area-pieces"),
    la = xr("area-piece"),
    ca = xr("avoid");
  function fa(t) {
    var n = t.areaElement,
      e = t.state,
      r = e.width,
      i = e.height;
    !(function (t, n) {
      if (t.classList) t.classList.remove(n);
      else {
        var e = new RegExp("(\\s|^)" + n + "(\\s|$)");
        t.className = t.className.replace(e, " ");
      }
    })(n, ca),
      (n.style.cssText +=
        "left: 0px; top: 0px; width: " + r + "px; height: " + i + "px");
  }
  function pa(t) {
    return t.createElement(
      "div",
      { key: "area_pieces", className: ua },
      t.createElement("div", { className: la }),
      t.createElement("div", { className: la }),
      t.createElement("div", { className: la }),
      t.createElement("div", { className: la })
    );
  }
  var da = {
      name: "dragArea",
      props: { dragArea: Boolean, passDragArea: Boolean },
      events: { onClick: "click", onClickGroup: "clickGroup" },
      render: function (t, n) {
        var e = t.props,
          r = e.target,
          i = e.dragArea,
          o = e.groupable,
          a = e.passDragArea,
          s = t.state,
          u = s.width,
          l = s.height,
          c = s.renderPoses,
          f = a ? xr("area", "pass") : xr("area");
        if (o)
          return [
            n.createElement("div", {
              key: "area",
              ref: ht(t, "areaElement"),
              className: f,
            }),
            pa(n),
          ];
        if (!r || !i) return [];
        var p = de([0, 0], [u, 0], [0, l], [u, l], c[0], c[1], c[2], c[3]),
          d = p.length ? Pr(p, !0) : "none";
        return [
          n.createElement("div", {
            key: "area",
            ref: ht(t, "areaElement"),
            className: f,
            style: {
              top: "0px",
              left: "0px",
              width: u + "px",
              height: l + "px",
              transformOrigin: "0 0",
              transform: d,
            },
          }),
          pa(n),
        ];
      },
      dragStart: function (t, n) {
        var e = n.datas,
          r = n.clientX,
          i = n.clientY;
        if (!n.inputEvent) return !1;
        e.isDragArea = !1;
        var o = t.areaElement,
          a = t.state,
          s = a.moveableClientRect,
          u = a.renderPoses,
          l = a.rootMatrix,
          c = a.is3d,
          f = s.left,
          p = s.top,
          d = _r(u),
          h = d.left,
          g = d.top,
          v = d.width,
          m = d.height,
          b = ai(l, [r - f, i - p], c ? 4 : 3),
          x = b[0],
          y = b[1],
          E = [
            { left: h, top: g, width: v, height: (y -= g) - 10 },
            { left: h, top: g, width: (x -= h) - 10, height: m },
            { left: h, top: g + y + 10, width: v, height: m - y - 10 },
            { left: h + x + 10, top: g, width: v - x - 10, height: m },
          ],
          S = [].slice.call(o.nextElementSibling.children);
        E.forEach(function (t, n) {
          S[n].style.cssText =
            "left: " +
            t.left +
            "px;top: " +
            t.top +
            "px; width: " +
            t.width +
            "px; height: " +
            t.height +
            "px;";
        }),
          (function (t, n) {
            t.classList ? t.classList.add(n) : (t.className += " " + n);
          })(o, ca);
      },
      drag: function (t, n) {
        var e = n.datas;
        if (!n.inputEvent) return !1;
        e.isDragArea || ((e.isDragArea = !0), fa(t));
      },
      dragEnd: function (t, n) {
        var e = n.inputEvent,
          r = n.datas;
        if (!e) return !1;
        r.isDragArea || fa(t);
      },
      dragGroupStart: function (t, n) {
        return this.dragStart(t, n);
      },
      dragGroup: function (t, n) {
        return this.drag(t, n);
      },
      dragGroupEnd: function (t, n) {
        return this.dragEnd(t, n);
      },
      unset: function (t) {
        fa(t);
      },
    },
    ha = {
      name: "origin",
      props: { origin: Boolean },
      events: {},
      render: function (t, n) {
        var e = t.props.zoom,
          r = t.state,
          i = r.beforeOrigin,
          o = r.rotation;
        return [
          n.createElement("div", {
            className: xr("control", "origin"),
            style: Fr(o, e, i),
            key: "beforeOrigin",
          }),
        ];
      },
    };
  function ga(t) {
    var n = t.scrollContainer;
    return [n.scrollLeft, n.scrollTop];
  }
  var va = {
      name: "scrollable",
      canPinch: !0,
      props: {
        scrollable: Boolean,
        scrollContainer: Object,
        scrollThreshold: Number,
        getScrollPosition: Function,
      },
      events: { onScroll: "scroll", onScrollGroup: "scrollGroup" },
      dragStart: function (t, n) {
        var e = t.props.scrollContainer,
          r = void 0 === e ? t.getContainer() : e,
          i = new Te(),
          o = di(r, !0);
        n.datas.dragScroll = i;
        var a = n.isControl ? "controlGesto" : "targetGesto",
          s = n.targets;
        i
          .on("scroll", function (e) {
            var r = e.container,
              i = e.direction,
              o = Kr(t, n, { scrollContainer: r, direction: i }),
              a = s ? "onScrollGroup" : "onScroll";
            s && (o.targets = s), Qr(t, a, o);
          })
          .on("move", function (e) {
            var r = e.offsetX,
              i = e.offsetY;
            t[a].scrollBy(r, i, n.inputEvent, !1);
          }),
          i.dragStart(n, { container: o });
      },
      checkScroll: function (t, n) {
        var e = n.datas.dragScroll;
        if (e) {
          var r = t.props,
            i = r.scrollContainer,
            o = void 0 === i ? t.getContainer() : i,
            a = r.scrollThreshold,
            s = void 0 === a ? 0 : a,
            u = r.getScrollPosition,
            l = void 0 === u ? ga : u;
          return (
            e.drag(n, {
              container: o,
              threshold: s,
              getScrollPosition: function (t) {
                return l({
                  scrollContainer: t.container,
                  direction: t.direction,
                });
              },
            }),
            !0
          );
        }
      },
      drag: function (t, n) {
        return this.checkScroll(t, n);
      },
      dragEnd: function (t, n) {
        n.datas.dragScroll.dragEnd(), (n.datas.dragScroll = null);
      },
      dragControlStart: function (t, n) {
        return this.dragStart(t, nr(nr({}, n), { isControl: !0 }));
      },
      dragControl: function (t, n) {
        return this.drag(t, n);
      },
      dragControlEnd: function (t, n) {
        return this.dragEnd(t, n);
      },
      dragGroupStart: function (t, n) {
        return this.dragStart(t, nr(nr({}, n), { targets: t.props.targets }));
      },
      dragGroup: function (t, n) {
        return this.drag(t, nr(nr({}, n), { targets: t.props.targets }));
      },
      dragGroupEnd: function (t, n) {
        return this.dragEnd(t, nr(nr({}, n), { targets: t.props.targets }));
      },
      dragGroupControlStart: function (t, n) {
        return this.dragStart(
          t,
          nr(nr({}, n), { targets: t.props.targets, isControl: !0 })
        );
      },
      dragGroupContro: function (t, n) {
        return this.drag(t, nr(nr({}, n), { targets: t.props.targets }));
      },
      dragGroupControEnd: function (t, n) {
        return this.dragEnd(t, nr(nr({}, n), { targets: t.props.targets }));
      },
    },
    ma = {
      name: "",
      props: {
        target: Object,
        dragTarget: Object,
        container: Object,
        portalContainer: Object,
        rootContainer: Object,
        zoom: Number,
        transformOrigin: Array,
        edge: Boolean,
        ables: Array,
        className: String,
        pinchThreshold: Number,
        pinchOutside: Boolean,
        triggerAblesSimultaneously: Boolean,
        checkInput: Boolean,
        cspNonce: String,
        translateZ: Number,
        props: Object,
      },
      events: {},
    },
    ba = {
      name: "padding",
      props: { padding: Object },
      events: {},
      render: function (t, n) {
        var e = t.props;
        if (e.dragArea) return [];
        var r = e.padding || {},
          i = r.left,
          o = void 0 === i ? 0 : i,
          a = r.top,
          s = void 0 === a ? 0 : a,
          u = r.right,
          l = void 0 === u ? 0 : u,
          c = r.bottom,
          f = void 0 === c ? 0 : c,
          p = t.state,
          d = p.renderPoses,
          h = [p.pos1, p.pos2, p.pos3, p.pos4],
          g = [];
        return (
          o > 0 && g.push([0, 2]),
          s > 0 && g.push([0, 1]),
          l > 0 && g.push([1, 3]),
          f > 0 && g.push([2, 3]),
          g.map(function (t, e) {
            var r = t[0],
              i = t[1],
              o = de(
                [0, 0],
                [100, 0],
                [0, 100],
                [100, 100],
                h[r],
                h[i],
                d[r],
                d[i]
              );
            if (o.length)
              return n.createElement("div", {
                key: "padding" + e,
                className: xr("padding"),
                style: { transform: Pr(o, !0) },
              });
          })
        );
      },
    },
    xa = ["nw", "ne", "se", "sw"];
  function ya(t, n) {
    var e = t[0] + t[1],
      r = e > n ? n / e : 1;
    return (t[0] *= r), (t[1] = n - t[1] * r), t;
  }
  var Ea = [1, 2, 5, 6],
    Sa = [0, 3, 4, 7],
    wa = [1, -1, -1, 1],
    Ma = [1, 1, -1, -1];
  function Ca(t, n, e, r, i, o, a, s, u) {
    void 0 === o && (o = 0),
      void 0 === a && (a = 0),
      void 0 === s && (s = r),
      void 0 === u && (u = i);
    var l = [],
      c = !1,
      f = t.map(function (t, f) {
        var p = n[f],
          d = p.horizontal,
          h = p.vertical;
        if ((h && !c && ((c = !0), l.push("/")), c)) {
          var g = Math.max(0, 1 === h ? t[1] - a : u - t[1]);
          return l.push(li(g, i, e)), g;
        }
        g = Math.max(0, 1 === d ? t[0] - o : s - t[0]);
        return l.push(li(g, r, e)), g;
      });
    return { styles: l, raws: f };
  }
  function Da(t) {
    for (var n = [0, 0], e = [0, 0], r = t.length, i = 0; i < r; ++i) {
      var o = t[i];
      o.sub &&
        (o.horizontal &&
          (0 === n[1] && (n[0] = i), (n[1] = i - n[0] + 1), (e[0] = i + 1)),
        o.vertical && (0 === e[1] && (e[0] = i), (e[1] = i - e[0] + 1)));
    }
    return { horizontalRange: n, verticalRange: e };
  }
  function Ra(t, n, e, r, i, o) {
    var a, s, u, l;
    void 0 === o && (o = [0, 0]);
    var c = t.indexOf("/"),
      f = (c > -1 ? t.slice(0, c) : t).length,
      p = t.slice(0, f),
      d = t.slice(f + 1),
      h = p[0],
      g = void 0 === h ? "0px" : h,
      v = p[1],
      m = void 0 === v ? g : v,
      b = p[2],
      x = void 0 === b ? g : b,
      y = p[3],
      E = void 0 === y ? m : y,
      S = d[0],
      w = void 0 === S ? g : S,
      M = d[1],
      C = void 0 === M ? w : M,
      D = d[2],
      R = void 0 === D ? w : D,
      O = d[3],
      P = void 0 === O ? C : O,
      z = [g, m, x, E].map(function (t) {
        return $t(t, n);
      }),
      G = [w, C, R, P].map(function (t) {
        return $t(t, e);
      }),
      B = z.slice(),
      T = G.slice();
    (a = ya([B[0], B[1]], n)),
      (B[0] = a[0]),
      (B[1] = a[1]),
      (s = ya([B[3], B[2]], n)),
      (B[3] = s[0]),
      (B[2] = s[1]),
      (u = ya([T[0], T[3]], e)),
      (T[0] = u[0]),
      (T[3] = u[1]),
      (l = ya([T[1], T[2]], e)),
      (T[1] = l[0]),
      (T[2] = l[1]);
    var _ = B.slice(0, Math.max(o[0], p.length)),
      k = T.slice(0, Math.max(o[1], d.length));
    return er(
      _.map(function (t, n) {
        var o = xa[n];
        return {
          horizontal: wa[n],
          vertical: 0,
          pos: [r + t, i + (-1 === Ma[n] ? e : 0)],
          sub: !0,
          raw: z[n],
          direction: o,
        };
      }),
      k.map(function (t, e) {
        var o = xa[e];
        return {
          horizontal: 0,
          vertical: Ma[e],
          pos: [r + (-1 === wa[e] ? n : 0), i + t],
          sub: !0,
          raw: G[e],
          direction: o,
        };
      })
    );
  }
  function Oa(t, n, e, r, i) {
    void 0 === i && (i = n.length);
    var o = Da(t.slice(r)),
      a = o.horizontalRange,
      s = o.verticalRange,
      u = e - r,
      l = 0;
    if (0 === u) l = i;
    else if (u > 0 && u < a[1]) l = a[1] - u;
    else {
      if (!(u >= s[0])) return;
      l = s[0] + s[1] - u;
    }
    t.splice(e, l), n.splice(e, l);
  }
  function Pa(t, n, e, r, i, o, a, s, u, l, c) {
    void 0 === l && (l = 0), void 0 === c && (c = 0);
    var f = Da(t.slice(e)),
      p = f.horizontalRange,
      d = f.verticalRange;
    if (r > -1)
      for (var h = 1 === wa[r] ? o - l : s - o, g = p[1]; g <= r; ++g) {
        var v = 1 === Ma[g] ? c : u,
          m = 0;
        if (
          (r === g
            ? (m = o)
            : 0 === g
            ? (m = l + h)
            : -1 === wa[g] && (m = s - (n[e][0] - l)),
          t.splice(e + g, 0, { horizontal: wa[g], vertical: 0, pos: [m, v] }),
          n.splice(e + g, 0, [m, v]),
          0 === g)
        )
          break;
      }
    else if (i > -1) {
      var b = 1 === Ma[i] ? a - c : u - a;
      if (0 === p[1] && 0 === d[1]) {
        var x = [l + b, c];
        t.push({ horizontal: wa[0], vertical: 0, pos: x }), n.push(x);
      }
      var y = d[0];
      for (g = d[1]; g <= i; ++g) {
        (m = 1 === wa[g] ? l : s), (v = 0);
        if (
          (i === g
            ? (v = a)
            : 0 === g
            ? (v = c + b)
            : 1 === Ma[g]
            ? (v = n[e + y][1])
            : -1 === Ma[g] && (v = u - (n[e + y][1] - c)),
          t.push({ horizontal: 0, vertical: Ma[g], pos: [m, v] }),
          n.push([m, v]),
          0 === g)
        )
          break;
      }
    }
  }
  function za(t, n) {
    return (
      void 0 === n &&
        (n = t.map(function (t) {
          return t.raw;
        })),
      {
        horizontals: t
          .map(function (t, e) {
            return t.horizontal ? n[e] : null;
          })
          .filter(function (t) {
            return null != t;
          }),
        verticals: t
          .map(function (t, e) {
            return t.vertical ? n[e] : null;
          })
          .filter(function (t) {
            return null != t;
          }),
      }
    );
  }
  var Ga = [
      [0, -1, "n"],
      [1, 0, "e"],
    ],
    Ba = [
      [-1, -1, "nw"],
      [0, -1, "n"],
      [1, -1, "ne"],
      [1, 0, "e"],
      [1, 1, "se"],
      [0, 1, "s"],
      [-1, 1, "sw"],
      [-1, 0, "w"],
    ];
  function Ta(t, n, e) {
    var r = t.props.clipRelative,
      i = t.state,
      o = i.width,
      a = i.height,
      s = n,
      u = s.type,
      l = s.poses,
      c = "rect" === u,
      f = "circle" === u;
    if ("polygon" === u)
      return e.map(function (t) {
        return li(t[0], o, r) + " " + li(t[1], a, r);
      });
    if (c || "inset" === u) {
      var p = e[1][1],
        d = e[3][0],
        h = e[7][0],
        g = e[5][1];
      if (c)
        return [p, d, g, h].map(function (t) {
          return t + "px";
        });
      var v = [p, o - d, a - g, h].map(function (t, n) {
        return li(t, n % 2 ? o : a, r);
      });
      if (e.length > 8) {
        var m = Qn(e[4], e[0]),
          b = m[0],
          x = m[1];
        v.push.apply(
          v,
          er(["round"], Ca(e.slice(8), l.slice(8), r, b, x, h, p, d, g).styles)
        );
      }
      return v;
    }
    if (f || "ellipse" === u) {
      var y = e[0],
        E = li(
          Math.abs(e[1][1] - y[1]),
          f ? Math.sqrt((o * o + a * a) / 2) : a,
          r
        );
      return (
        (v = f ? [E] : [li(Math.abs(e[2][0] - y[0]), o, r), E]).push(
          "at",
          li(y[0], o, r),
          li(y[1], a, r)
        ),
        v
      );
    }
  }
  function _a(t, n, e, r) {
    var i = [r, (r + n) / 2, n],
      o = [t, (t + e) / 2, e];
    return Ba.map(function (t) {
      var n = t[0],
        e = t[1],
        r = t[2],
        a = i[n + 1],
        s = o[e + 1];
      return {
        vertical: Math.abs(e),
        horizontal: Math.abs(n),
        direction: r,
        pos: [a, s],
      };
    });
  }
  function ka(t, n, e, r, i) {
    var o,
      a,
      s,
      u,
      l,
      c,
      f,
      p = i;
    if (!p) {
      var d = getComputedStyle(t),
        h = d.clipPath;
      p = "none" !== h ? h : d.clip;
    }
    if ((p && "none" !== p && "auto" !== p) || (p = r)) {
      var g = At(p),
        v = g.prefix,
        m = void 0 === v ? p : v,
        b = g.value,
        x = void 0 === b ? "" : b,
        y = "circle" === m,
        E = " ";
      if ("polygon" === m)
        return (
          (E = ","),
          {
            type: m,
            clipText: p,
            poses: (G = (D = kt(x || "0% 0%, 100% 0%, 100% 100%, 0% 100%")).map(
              function (t) {
                var r = t.split(" "),
                  i = r[0],
                  o = r[1];
                return {
                  vertical: 1,
                  horizontal: 1,
                  pos: [$t(i, n), $t(o, e)],
                };
              }
            )),
            splitter: E,
          }
        );
      if (y || "ellipse" === m) {
        var S = "",
          w = "",
          M = 0,
          C = 0,
          D = _t(x);
        if (y) {
          var R;
          (R = void 0 === (o = D[0]) ? "50%" : o),
            (S = void 0 === (a = D[2]) ? "50%" : a),
            (w = void 0 === (s = D[3]) ? "50%" : s),
            (M = $t(R, Math.sqrt((n * n + e * e) / 2))),
            (C = M);
        } else {
          var O, P;
          (O = void 0 === (u = D[0]) ? "50%" : u),
            (P = void 0 === (l = D[1]) ? "50%" : l),
            (S = void 0 === (c = D[3]) ? "50%" : c),
            (w = void 0 === (f = D[4]) ? "50%" : f),
            (M = $t(O, n)),
            (C = $t(P, e));
        }
        var z = [$t(S, n), $t(w, e)],
          G = er(
            [{ vertical: 1, horizontal: 1, pos: z, direction: "nesw" }],
            Ga.slice(0, y ? 1 : 2).map(function (t) {
              return {
                vertical: Math.abs(t[1]),
                horizontal: t[0],
                direction: t[2],
                sub: !0,
                pos: [z[0] + t[0] * M, z[1] + t[1] * C],
              };
            })
          );
        return {
          type: m,
          clipText: p,
          radiusX: M,
          radiusY: C,
          left: z[0] - M,
          top: z[1] - C,
          poses: G,
          splitter: E,
        };
      }
      if ("inset" === m) {
        var B = (D = _t(x || "0 0 0 0")).indexOf("round"),
          T = (B > -1 ? D.slice(0, B) : D).length,
          _ = D.slice(T + 1),
          k = D.slice(0, T),
          A = k[0],
          I = k[1],
          j = void 0 === I ? A : I,
          N = k[2],
          F = void 0 === N ? A : N,
          Y = k[3],
          X = void 0 === Y ? j : Y,
          $ = [A, F].map(function (t) {
            return $t(t, e);
          }),
          L = $[0],
          q = $[1],
          V = [X, j].map(function (t) {
            return $t(t, n);
          }),
          W = V[0],
          H = V[1],
          U = n - H,
          Z = e - q,
          K = Ra(_, U - W, Z - L, W, L);
        return {
          type: "inset",
          clipText: p,
          poses: (G = er(_a(L, U, Z, W), K)),
          top: L,
          left: W,
          right: U,
          bottom: Z,
          radius: _,
          splitter: E,
        };
      }
      if ("rect" === m) {
        E = ",";
        var J = (D = kt(x || "0px, " + n + "px, " + e + "px, 0px")).map(
          function (t) {
            return It(t).value;
          }
        );
        return {
          type: "rect",
          clipText: p,
          poses: (G = _a((L = J[0]), (H = J[1]), (q = J[2]), (W = J[3]))),
          top: L,
          right: H,
          bottom: q,
          left: W,
          values: D,
          splitter: E,
        };
      }
    }
  }
  var Aa = {
      name: "clippable",
      props: {
        clippable: Boolean,
        defaultClipPath: String,
        customClipPath: String,
        clipRelative: Boolean,
        clipArea: Boolean,
        dragWithClip: Boolean,
        clipTargetBounds: Boolean,
        clipVerticalGuidelines: Array,
        clipHorizontalGuidelines: Array,
        clipSnapThreshold: Boolean,
      },
      events: {
        onClipStart: "clipStart",
        onClip: "clip",
        onClipEnd: "clipEnd",
      },
      css: [
        ".control.clip-control {\n    background: #6d6;\n    cursor: pointer;\n}\n.control.clip-control.clip-radius {\n    background: #d66;\n}\n.line.clip-line {\n    background: #6e6;\n    cursor: move;\n    z-index: 1;\n}\n.clip-area {\n    position: absolute;\n    top: 0;\n    left: 0;\n}\n.clip-ellipse {\n    position: absolute;\n    cursor: move;\n    border: 1px solid #6d6;\n    border: var(--zoompx) solid #6d6;\n    border-radius: 50%;\n    transform-origin: 0px 0px;\n}",
        ":host {\n    --bounds-color: #d66;\n}",
        ".guideline {\n    pointer-events: none;\n    z-index: 2;\n}",
        ".line.guideline.bounds {\n    background: #d66;\n    background: var(--bounds-color);\n}",
      ],
      render: function (t, n) {
        var e = t.props,
          r = e.customClipPath,
          i = e.defaultClipPath,
          o = e.clipArea,
          a = e.zoom,
          s = t.state,
          u = s.target,
          l = s.width,
          c = s.height,
          f = s.allMatrix,
          p = s.is3d,
          d = s.left,
          h = s.top,
          g = s.pos1,
          v = s.pos2,
          m = s.pos3,
          b = s.pos4,
          x = s.clipPathState,
          y = s.snapBoundInfos;
        if (!u) return [];
        var E = ka(u, l, c, i || "inset", x || r);
        if (!E) return [];
        var S = p ? 4 : 3,
          w = E.type,
          M = E.poses.map(function (t) {
            var n = Br(f, t.pos, S);
            return [n[0] - d, n[1] - h];
          }),
          C = [],
          D = [],
          R = "rect" === w,
          O = "inset" === w,
          P = "polygon" === w;
        if (R || O || P) {
          var z = O ? M.slice(0, 8) : M;
          D = z.map(function (t, e) {
            var r = 0 === e ? z[z.length - 1] : z[e - 1],
              i = Ht(r, t),
              o = jr(r, t);
            return n.createElement("div", {
              key: "clipLine" + e,
              className: xr("line", "clip-line", "snap-control"),
              "data-clip-index": e,
              style: {
                width: o + "px",
                transform:
                  "translate(" +
                  r[0] +
                  "px, " +
                  r[1] +
                  "px) rotate(" +
                  i +
                  "rad) scaleY(" +
                  a +
                  ")",
              },
            });
          });
        }
        if (
          ((C = M.map(function (t, e) {
            return n.createElement("div", {
              key: "clipControl" + e,
              className: xr("control", "clip-control", "snap-control"),
              "data-clip-index": e,
              style: {
                transform:
                  "translate(" + t[0] + "px, " + t[1] + "px) scale(" + a + ")",
              },
            });
          })),
          O &&
            C.push.apply(
              C,
              M.slice(8).map(function (t, e) {
                return n.createElement("div", {
                  key: "clipRadiusControl" + e,
                  className: xr(
                    "control",
                    "clip-control",
                    "clip-radius",
                    "snap-control"
                  ),
                  "data-clip-index": 8 + e,
                  style: {
                    transform:
                      "translate(" +
                      t[0] +
                      "px, " +
                      t[1] +
                      "px) scale(" +
                      a +
                      ")",
                  },
                });
              })
            ),
          "circle" === w || "ellipse" === w)
        ) {
          var G = E.left,
            B = E.top,
            T = E.radiusX,
            _ = E.radiusY,
            k = Qn(Br(f, [G, B], S), Br(f, [0, 0], S)),
            A = k[0],
            I = k[1],
            j = "none";
          if (!o) {
            for (
              var N = Math.max(10, T / 5, _ / 5), F = [], Y = 0;
              Y <= N;
              ++Y
            ) {
              var X = ((2 * Math.PI) / N) * Y;
              F.push([T + (T - a) * Math.cos(X), _ + (_ - a) * Math.sin(X)]);
            }
            F.push([T, -2]),
              F.push([-2, -2]),
              F.push([-2, 2 * _ + 2]),
              F.push([2 * T + 2, 2 * _ + 2]),
              F.push([2 * T + 2, -2]),
              F.push([T, -2]),
              (j =
                "polygon(" +
                F.map(function (t) {
                  return t[0] + "px " + t[1] + "px";
                }).join(", ") +
                ")");
          }
          C.push(
            n.createElement("div", {
              key: "clipEllipse",
              className: xr("clip-ellipse", "snap-control"),
              style: {
                width: 2 * T + "px",
                height: 2 * _ + "px",
                clipPath: j,
                transform:
                  "translate(" + (-d + A) + "px, " + (-h + I) + "px) " + Pr(f),
              },
            })
          );
        }
        if (o) {
          var $ = _r(er([g, v, m, b], M)),
            L = $.width,
            q = $.height,
            V = $.left,
            W = $.top;
          if (P || R || O) {
            F = O ? M.slice(0, 8) : M;
            C.push(
              n.createElement("div", {
                key: "clipArea",
                className: xr("clip-area", "snap-control"),
                style: {
                  width: L + "px",
                  height: q + "px",
                  transform: "translate(" + V + "px, " + W + "px)",
                  clipPath:
                    "polygon(" +
                    F.map(function (t) {
                      return t[0] - V + "px " + (t[1] - W) + "px";
                    }).join(", ") +
                    ")",
                },
              })
            );
          }
        }
        return (
          y &&
            ["vertical", "horizontal"].forEach(function (t) {
              var e = y[t],
                r = "horizontal" === t;
              e.isSnap &&
                D.push.apply(
                  D,
                  e.snap.posInfos.map(function (e, i) {
                    var o = e.pos,
                      s = Qn(Br(f, r ? [0, o] : [o, 0], S), [d, h]),
                      u = Qn(Br(f, r ? [l, o] : [o, c], S), [d, h]);
                    return Ho(
                      n,
                      "",
                      s,
                      u,
                      a,
                      "clip" + t + "snap" + i,
                      "guideline"
                    );
                  })
                ),
                e.isBound &&
                  D.push.apply(
                    D,
                    e.bounds.map(function (e, i) {
                      var o = e.pos,
                        s = Qn(Br(f, r ? [0, o] : [o, 0], S), [d, h]),
                        u = Qn(Br(f, r ? [l, o] : [o, c], S), [d, h]);
                      return Ho(
                        n,
                        "",
                        s,
                        u,
                        a,
                        "clip" + t + "bounds" + i,
                        "guideline",
                        "bounds",
                        "bold"
                      );
                    })
                  );
            }),
          er(C, D)
        );
      },
      dragControlCondition: function (t) {
        return (
          t.inputEvent &&
          (t.inputEvent.target.getAttribute("class") || "").indexOf("clip") > -1
        );
      },
      dragStart: function (t, n) {
        var e = t.props.dragWithClip;
        return !(void 0 === e || e) && this.dragControlStart(t, n);
      },
      drag: function (t, n) {
        return this.dragControl(t, n);
      },
      dragEnd: function (t, n) {
        return this.dragControlEnd(t, n);
      },
      dragControlStart: function (t, n) {
        var e = t.state,
          r = t.props,
          i = r.defaultClipPath,
          o = r.customClipPath,
          a = e.target,
          s = e.width,
          u = e.height,
          l = n.inputEvent ? n.inputEvent.target : null,
          c = l ? l.getAttribute("class") : "",
          f = n.datas,
          p = ka(a, s, u, i || "inset", o);
        if (!p) return !1;
        var d = p.clipText;
        return !1 ===
          Qr(
            t,
            "onClipStart",
            Kr(t, n, {
              clipType: p.type,
              clipStyle: d,
              poses: p.poses.map(function (t) {
                return t.pos;
              }),
            })
          )
          ? ((f.isClipStart = !1), !1)
          : ((f.isControl = c.indexOf("clip-control") > -1),
            (f.isLine = c.indexOf("clip-line") > -1),
            (f.isArea =
              c.indexOf("clip-area") > -1 || c.indexOf("clip-ellipse") > -1),
            (f.index = l
              ? parseInt(l.getAttribute("data-clip-index"), 10)
              : -1),
            (f.clipPath = p),
            (f.isClipStart = !0),
            (e.clipPathState = d),
            wi(t, n),
            !0);
      },
      dragControl: function (t, n) {
        var e = n.datas,
          r = n.originalDatas;
        if (!e.isClipStart) return !1;
        var i = (r && r.draggable) || {},
          o = e,
          a = o.isControl,
          s = o.isLine,
          u = o.isArea,
          l = o.index,
          c = o.clipPath;
        if (!c) return !1;
        var f = i.isDrag ? i.prevDist : Pi(n),
          p = f[0],
          d = f[1],
          h = t.props,
          g = t.state,
          v = g.width,
          m = g.height,
          b = !u && !a && !s,
          x = c.type,
          y = c.poses,
          E = c.splitter,
          S = y.map(function (t) {
            return t.pos;
          });
        b && ((p = -p), (d = -d));
        var w = !a || "nesw" === y[l].direction,
          M = "inset" === x || "rect" === x,
          C = y.map(function () {
            return [0, 0];
          });
        if (a && !w) {
          var D = y[l],
            R = D.horizontal,
            O = D.vertical,
            P = [p * Math.abs(R), d * Math.abs(O)];
          C = (function (t, n, e, r) {
            var i = t[n],
              o = i.direction,
              a = i.sub,
              s = t.map(function () {
                return [0, 0];
              }),
              u = o ? o.split("") : [];
            if (r && n < 8) {
              var l = u.filter(function (t) {
                  return "w" === t || "e" === t;
                })[0],
                c = u.filter(function (t) {
                  return "n" === t || "s" === t;
                })[0];
              (s[n] = e),
                t.forEach(function (t, n) {
                  var r = t.direction;
                  r &&
                    (r.indexOf(l) > -1 && (s[n][0] = e[0]),
                    r.indexOf(c) > -1 && (s[n][1] = e[1]));
                }),
                l && ((s[1][0] = e[0] / 2), (s[5][0] = e[0] / 2)),
                c && ((s[3][1] = e[1] / 2), (s[7][1] = e[1] / 2));
            } else
              o && !a
                ? u.forEach(function (n) {
                    var r = "n" === n || "s" === n;
                    t.forEach(function (t, i) {
                      var o = t.direction,
                        a = t.horizontal,
                        u = t.vertical;
                      o &&
                        -1 !== o.indexOf(n) &&
                        (s[i] = [r || !a ? 0 : e[0], r && u ? e[1] : 0]);
                    });
                  })
                : (s[n] = e);
            return s;
          })(y, l, P, M);
        } else
          w &&
            (C = S.map(function () {
              return [p, d];
            }));
        var z = S.map(function (t, n) {
            return Jn(t, C[n]);
          }),
          G = er(z);
        g.snapBoundInfos = null;
        var B = "circle" === c.type,
          T = "ellipse" === c.type;
        if (B || T) {
          var _ = _r(z),
            k = Math.abs(_.bottom - _.top),
            A = Math.abs(T ? _.right - _.left : k),
            I = z[0][1] + k,
            j = z[0][0] - A,
            N = z[0][0] + A;
          B && (G.push([N, _.bottom]), C.push([1, 0])),
            G.push([_.left, I]),
            C.push([0, 1]),
            G.push([j, _.bottom]),
            C.push([1, 0]);
        }
        var F = Wi(
            [],
            v,
            m,
            (h.clipHorizontalGuidelines || []).map(function (t) {
              return $t("" + t, m);
            }),
            (h.clipVerticalGuidelines || []).map(function (t) {
              return $t("" + t, v);
            })
          ),
          Y = [],
          X = [];
        if (B || T) (Y = [G[4][0], G[2][0]]), (X = [G[1][1], G[3][1]]);
        else if (M) {
          var $ = [G[0], G[2], G[4], G[6]],
            L = [C[0], C[2], C[4], C[6]];
          (Y = $.filter(function (t, n) {
            return L[n][0];
          }).map(function (t) {
            return t[0];
          })),
            (X = $.filter(function (t, n) {
              return L[n][1];
            }).map(function (t) {
              return t[1];
            }));
        } else
          (Y = G.filter(function (t, n) {
            return C[n][0];
          }).map(function (t) {
            return t[0];
          })),
            (X = G.filter(function (t, n) {
              return C[n][1];
            }).map(function (t) {
              return t[1];
            }));
        for (
          var q = function (t) {
              var n = Oo(
                  F,
                  h.clipTargetBounds && {
                    left: 0,
                    top: 0,
                    right: v,
                    bottom: m,
                  },
                  Y,
                  X,
                  { snapThreshold: 5 }
                ),
                e = n.horizontal,
                r = n.vertical,
                i = e.offset,
                o = r.offset;
              if ((!T && !B) || 0 !== C[0][0] || 0 !== C[0][1])
                return (
                  G.forEach(function (t, n) {
                    var e = C[n];
                    e[0] && (t[0] -= o), e[1] && (t[1] -= i);
                  }),
                  "break"
                );
              var a = _r(z),
                s = a.bottom - a.top,
                u = T ? a.right - a.left : s;
              (u -= r.isBound ? Math.abs(o) : 0 === r.snapIndex ? -o : o),
                (s -= e.isBound ? Math.abs(i) : 0 === e.snapIndex ? -i : i),
                B && (u = s = eo(r, e) > 0 ? s : u);
              var l = G[0];
              (G[1][1] = l[1] - s),
                (G[2][0] = l[0] + u),
                (G[3][1] = l[1] + s),
                (G[4][0] = l[0] - u);
            },
            V = 0;
          V < 2;
          ++V
        ) {
          if ("break" === q()) break;
        }
        var W = Ta(t, c, z),
          H = x + "(" + W.join(E) + ")";
        if (((g.clipPathState = H), B || T))
          (Y = [G[4][0], G[2][0]]), (X = [G[1][1], G[3][1]]);
        else if (M) {
          $ = [G[0], G[2], G[4], G[6]];
          (Y = $.map(function (t) {
            return t[0];
          })),
            (X = $.map(function (t) {
              return t[1];
            }));
        } else
          (Y = G.map(function (t) {
            return t[0];
          })),
            (X = G.map(function (t) {
              return t[1];
            }));
        return (
          (g.snapBoundInfos = Oo(
            F,
            h.clipTargetBounds && { left: 0, top: 0, right: v, bottom: m },
            Y,
            X,
            { snapThreshold: 1 }
          )),
          Qr(
            t,
            "onClip",
            Kr(t, n, {
              clipEventType: "changed",
              clipType: x,
              poses: z,
              clipStyle: H,
              clipStyles: W,
              distX: p,
              distY: d,
            })
          ),
          !0
        );
      },
      dragControlEnd: function (t, n) {
        this.unset(t);
        var e = n.isDrag,
          r = n.datas,
          i = n.isDouble,
          o = r.isLine,
          a = r.isClipStart,
          s = r.isControl;
        return (
          !!a &&
          (Qr(t, "onClipEnd", Jr(t, n, {})),
          i &&
            (s
              ? (function (t, n) {
                  var e = n.datas,
                    r = e.clipPath,
                    i = e.index,
                    o = r,
                    a = o.type,
                    s = o.poses,
                    u = o.splitter,
                    l = s.map(function (t) {
                      return t.pos;
                    }),
                    c = l.length;
                  if ("polygon" === a) s.splice(i, 1), l.splice(i, 1);
                  else {
                    if ("inset" !== a) return;
                    if (i < 8) return;
                    if ((Oa(s, l, i, 8, c), c === s.length)) return;
                  }
                  var f = Ta(t, r, l);
                  Qr(
                    t,
                    "onClip",
                    Kr(t, n, {
                      clipEventType: "removed",
                      clipType: a,
                      poses: l,
                      clipStyles: f,
                      clipStyle: a + "(" + f.join(u) + ")",
                      distX: 0,
                      distY: 0,
                    })
                  );
                })(t, n)
              : o &&
                (function (t, n) {
                  var e = Si(t, n),
                    r = e[0],
                    i = e[1],
                    o = n.datas,
                    a = o.clipPath,
                    s = o.index,
                    u = a,
                    l = u.type,
                    c = u.poses,
                    f = u.splitter,
                    p = c.map(function (t) {
                      return t.pos;
                    });
                  if ("polygon" === l) p.splice(s, 0, [r, i]);
                  else {
                    if ("inset" !== l) return;
                    var d = Ea.indexOf(s),
                      h = Sa.indexOf(s),
                      g = c.length;
                    if (
                      (Pa(
                        c,
                        p,
                        8,
                        d,
                        h,
                        r,
                        i,
                        p[4][0],
                        p[4][1],
                        p[0][0],
                        p[0][1]
                      ),
                      g === c.length)
                    )
                      return;
                  }
                  var v = Ta(t, a, p);
                  Qr(
                    t,
                    "onClip",
                    Kr(t, n, {
                      clipEventType: "added",
                      clipType: l,
                      poses: p,
                      clipStyles: v,
                      clipStyle: l + "(" + v.join(f) + ")",
                      distX: 0,
                      distY: 0,
                    })
                  );
                })(t, n)),
          i || e)
        );
      },
      unset: function (t) {
        (t.state.clipPathState = ""), (t.state.snapBoundInfos = null);
      },
    },
    Ia = {
      name: "originDraggable",
      props: { originDraggable: Boolean, originRelative: Boolean },
      events: {
        onDragOriginStart: "dragOriginStart",
        onDragOrigin: "dragOrigin",
        onDragOriginEnd: "dragOriginEnd",
      },
      css: [
        ":host[data-able-origindraggable] .control.origin {\n    pointer-events: auto;\n}",
      ],
      dragControlCondition: function (t) {
        return t.isRequest
          ? "originDraggable" === t.requestAble
          : Kt(t.inputEvent.target, xr("origin"));
      },
      dragControlStart: function (t, n) {
        var e = n.datas;
        wi(t, n);
        var r = Kr(t, n, {
            dragStart: Vo.dragStart(t, new bi().dragStart([0, 0], n)),
          }),
          i = Qr(t, "onDragOriginStart", r);
        return (
          (e.startOrigin = t.state.transformOrigin),
          (e.startTargetOrigin = t.state.targetOrigin),
          (e.prevOrigin = [0, 0]),
          (e.isDragOrigin = !0),
          !1 === i ? ((e.isDragOrigin = !1), !1) : r
        );
      },
      dragControl: function (t, n) {
        var e = n.datas,
          r = n.isPinch,
          i = n.isRequest;
        if (!e.isDragOrigin) return !1;
        var o = Pi(n),
          a = o[0],
          s = o[1],
          u = t.state,
          l = u.width,
          c = u.height,
          f = u.offsetMatrix,
          p = u.targetMatrix,
          d = u.is3d,
          h = t.props.originRelative,
          g = void 0 === h || h,
          v = d ? 4 : 3,
          m = [a, s];
        if (i) {
          var b = n.distOrigin;
          (b[0] || b[1]) && (m = b);
        }
        var x = Jn(e.startOrigin, m),
          y = Jn(e.startTargetOrigin, m),
          E = Qn(m, e.prevOrigin),
          S = Ti(f, p, x, v),
          w = t.getRect(),
          M = _r(Tr(S, l, c, v)),
          C = [w.left - M.left, w.top - M.top];
        e.prevOrigin = m;
        var D = Kr(t, n, {
          width: l,
          height: c,
          origin: x,
          dist: m,
          delta: E,
          transformOrigin: [li(y[0], l, g), li(y[1], c, g)].join(" "),
          drag: Vo.drag(t, mi(n, t.state, C, !!r, !1)),
        });
        return Qr(t, "onDragOrigin", D), D;
      },
      dragControlEnd: function (t, n) {
        return (
          !!n.datas.isDragOrigin && (Qr(t, "onDragOriginEnd", Jr(t, n, {})), !0)
        );
      },
      dragGroupControlCondition: function (t) {
        return this.dragControlCondition(t);
      },
      dragGroupControlStart: function (t, n) {
        return !!this.dragControlStart(t, n);
      },
      dragGroupControl: function (t, n) {
        var e = this.dragControl(t, n);
        return !!e && ((t.transformOrigin = e.transformOrigin), !0);
      },
      request: function (t) {
        var n = {},
          e = t.getRect(),
          r = 0,
          i = 0,
          o = e.transformOrigin,
          a = [0, 0];
        return {
          isControl: !0,
          requestStart: function () {
            return { datas: n };
          },
          request: function (t) {
            return (
              "deltaOrigin" in t
                ? ((a[0] += t.deltaOrigin[0]), (a[1] += t.deltaOrigin[1]))
                : "origin" in t
                ? ((a[0] = t.origin[0] - o[0]), (a[1] = t.origin[1] - o[1]))
                : ("x" in t
                    ? (r = t.x - e.left)
                    : "deltaX" in t && (r += t.deltaX),
                  "y" in t
                    ? (i = t.y - e.top)
                    : "deltaY" in t && (i += t.deltaY)),
              { datas: n, distX: r, distY: i, distOrigin: a }
            );
          },
          requestEnd: function () {
            return { datas: n, isDrag: !0 };
          },
        };
      },
    };
  function ja(t, n, e, r, i) {
    var o;
    void 0 === r && (r = [0, 0]);
    if (i) o = i;
    else {
      var a = window.getComputedStyle(t);
      o = (a && a.borderRadius) || "";
    }
    return Ra(!o || (!i && "0px" === o) ? [] : _t(o), n, e, 0, 0, r);
  }
  function Na(t, n, e, r, i, o) {
    var a = t.state,
      s = a.width,
      u = a.height,
      l = Ca(o, i, t.props.roundRelative, s, u),
      c = l.raws,
      f = l.styles,
      p = za(i, c),
      d = p.horizontals,
      h = p.verticals,
      g = f.join(" ");
    (a.borderRadiusState = g),
      Qr(
        t,
        "onRound",
        Kr(t, n, {
          horizontals: d,
          verticals: h,
          borderRadius: g,
          width: s,
          height: u,
          delta: r,
          dist: e,
        })
      );
  }
  var Fa = {
      name: "roundable",
      props: {
        roundable: Boolean,
        roundRelative: Boolean,
        minRoundControls: Array,
        maxRoundControls: Array,
        roundClickable: Boolean,
      },
      events: {
        onRoundStart: "roundStart",
        onRound: "round",
        onRoundEnd: "roundEnd",
      },
      css: [
        ".control.border-radius {\n    background: #d66;\n    cursor: pointer;\n}",
        ":host[data-able-roundable] .line.direction {\n    cursor: pointer;\n}",
      ],
      render: function (t, n) {
        var e = t.state,
          r = e.target,
          i = e.width,
          o = e.height,
          a = e.allMatrix,
          s = e.is3d,
          u = e.left,
          l = e.top,
          c = e.borderRadiusState,
          f = t.props,
          p = f.minRoundControls,
          d = void 0 === p ? [0, 0] : p,
          h = f.maxRoundControls,
          g = void 0 === h ? [4, 4] : h,
          v = f.zoom;
        if (!r) return null;
        var m = s ? 4 : 3,
          b = ja(r, i, o, d, c);
        if (!b) return null;
        var x = 0,
          y = 0;
        return b.map(function (t, e) {
          (y += Math.abs(t.horizontal)), (x += Math.abs(t.vertical));
          var r = Qn(Br(a, t.pos, m), [u, l]),
            i = t.vertical ? x <= g[1] : y <= g[0];
          return n.createElement("div", {
            key: "borderRadiusControl" + e,
            className: xr("control", "border-radius"),
            "data-radius-index": e,
            style: {
              display: i ? "block" : "none",
              transform:
                "translate(" + r[0] + "px, " + r[1] + "px) scale(" + v + ")",
            },
          });
        });
      },
      dragControlCondition: function (t) {
        if (!t.inputEvent || t.isRequest) return !1;
        var n = t.inputEvent.target.getAttribute("class") || "";
        return (
          n.indexOf("border-radius") > -1 ||
          (n.indexOf("moveable-line") > -1 &&
            n.indexOf("moveable-direction") > -1)
        );
      },
      dragControlStart: function (t, n) {
        var e = n.inputEvent,
          r = n.datas,
          i = e.target,
          o = i.getAttribute("class") || "",
          a = o.indexOf("border-radius") > -1,
          s =
            o.indexOf("moveable-line") > -1 &&
            o.indexOf("moveable-direction") > -1,
          u = a ? parseInt(i.getAttribute("data-radius-index"), 10) : -1,
          l = s ? parseInt(i.getAttribute("data-line-index"), 10) : -1;
        if (!a && !s) return !1;
        if (!1 === Qr(t, "onRoundStart", Kr(t, n, {}))) return !1;
        (r.lineIndex = l),
          (r.controlIndex = u),
          (r.isControl = a),
          (r.isLine = s),
          wi(t, n);
        var c = t.props,
          f = c.roundRelative,
          p = c.minRoundControls,
          d = void 0 === p ? [0, 0] : p,
          h = t.state,
          g = h.target,
          v = h.width,
          m = h.height;
        (r.isRound = !0), (r.prevDist = [0, 0]);
        var b = ja(g, v, m, d) || [];
        return (
          (r.controlPoses = b),
          (h.borderRadiusState = Ca(
            b.map(function (t) {
              return t.pos;
            }),
            b,
            f,
            v,
            m
          ).styles.join(" ")),
          !0
        );
      },
      dragControl: function (t, n) {
        var e = n.datas;
        if (!e.isRound || !e.isControl || !e.controlPoses.length) return !1;
        var r = e.controlIndex,
          i = e.controlPoses,
          o = Pi(n),
          a = o[0],
          s = o[1],
          u = [a, s],
          l = Qn(u, e.prevDist),
          c = t.props.maxRoundControls,
          f = void 0 === c ? [4, 4] : c,
          p = t.state,
          d = p.width,
          h = p.height,
          g = i[r],
          v = g.vertical,
          m = g.horizontal,
          b = i.map(function (t) {
            var n = t.horizontal,
              e = t.vertical,
              r = [n * m * u[0], e * v * u[1]];
            if (n) {
              if (1 === f[0]) return r;
              if (f[0] < 4 && n !== m) return r;
            } else {
              if (0 === f[1]) return (r[1] = ((e * m * u[0]) / d) * h), r;
              if (v) {
                if (1 === f[1]) return r;
                if (f[1] < 4 && e !== v) return r;
              }
            }
            return [0, 0];
          });
        b[r] = u;
        var x = i.map(function (t, n) {
          return Jn(t.pos, b[n]);
        });
        return (e.prevDist = [a, s]), Na(t, n, u, l, i, x), !0;
      },
      dragControlEnd: function (t, n) {
        var e = t.state;
        e.borderRadiusState = "";
        var r = n.datas,
          i = n.isDouble;
        if (!r.isRound) return !1;
        var o = e.width,
          a = e.height,
          s = r.isControl,
          u = r.controlIndex,
          l = r.isLine,
          c = r.lineIndex,
          f = r.controlPoses,
          p = f.map(function (t) {
            return t.pos;
          }),
          d = p.length,
          h = t.props.roundClickable;
        if (i && (void 0 === h || h)) {
          if (s) Oa(f, p, u, 0);
          else if (l) {
            var g = Si(t, n);
            !(function (t, n, e, r, i, o, a) {
              var s = za(t),
                u = s.horizontals,
                l = s.verticals,
                c = u.length,
                f = l.length,
                p = -1,
                d = -1;
              0 === e
                ? 0 === c
                  ? (p = 0)
                  : 1 === c && (p = 1)
                : 3 === e && (c <= 2 ? (p = 2) : c <= 3 && (p = 3)),
                2 === e
                  ? 0 === f
                    ? (d = 0)
                    : f < 4 && (d = 3)
                  : 1 === e && (f <= 1 ? (d = 1) : f <= 2 && (d = 2)),
                Pa(t, n, 0, p, d, r, i, o, a);
            })(f, p, c, g[0], g[1], o, a);
          }
          d !== f.length && Na(t, n, [0, 0], [0, 0], f, p);
        }
        return (
          Qr(t, "onRoundEnd", Jr(t, n, {})), (e.borderRadiusState = ""), !0
        );
      },
      unset: function (t) {
        t.state.borderRadiusState = "";
      },
    },
    Ya = {
      isPinch: !0,
      name: "beforeRenderable",
      props: {},
      events: {
        onBeforeRenderStart: "beforeRenderStart",
        onBeforeRender: "beforeRender",
        onBeforeRenderEnd: "beforeRenderEnd",
        onBeforeRenderGroupStart: "beforeRenderGroupStart",
        onBeforeRenderGroup: "beforeRenderGroup",
        onBeforeRenderGroupEnd: "beforeRenderGroupEnd",
      },
      setTransform: function (t, n) {
        var e = t.state,
          r = e.is3d,
          i = e.targetMatrix,
          o = r ? "matrix3d(" + i.join(",") + ")" : "matrix(" + te(i, !0) + ")";
        n.datas.startTransforms = [o];
      },
      resetTransform: function (t, n) {
        (n.datas.nextTransforms = n.datas.startTransforms),
          (n.datas.nextTransformAppendedIndexes = []);
      },
      fillDragStartParams: function (t, n) {
        return Kr(t, n, {
          setTransform: function (t) {
            n.datas.startTransforms = Pt(t) ? t : _t(t);
          },
          isPinch: !!n.isPinch,
        });
      },
      fillDragParams: function (t, n) {
        return Kr(t, n, { isPinch: !!n.isPinch });
      },
      dragStart: function (t, n) {
        this.setTransform(t, n),
          Qr(t, "onBeforeRenderStart", this.fillDragStartParams(t, n));
      },
      drag: function (t, n) {
        this.resetTransform(t, n),
          Qr(t, "onBeforeRender", Kr(t, n, { isPinch: !!n.isPinch }));
      },
      dragEnd: function (t, n) {
        Qr(
          t,
          "onBeforeRenderEnd",
          Kr(t, n, { isPinch: !!n.isPinch, isDrag: n.isDrag })
        );
      },
      dragGroupStart: function (t, n) {
        var e = this;
        this.dragStart(t, n);
        var r = xi(t, "beforeRenderable", n),
          i = t.moveables,
          o = r.map(function (t, n) {
            var r = i[n];
            return e.setTransform(r, t), e.fillDragStartParams(r, t);
          });
        Qr(
          t,
          "onBeforeRenderGroupStart",
          Kr(t, n, {
            isPinch: !!n.isPinch,
            targets: t.props.targets,
            setTransform: function () {},
            events: o,
          })
        );
      },
      dragGroup: function (t, n) {
        var e = this;
        this.drag(t, n);
        var r = xi(t, "beforeRenderable", n),
          i = t.moveables,
          o = r.map(function (t, n) {
            var r = i[n];
            return e.resetTransform(r, t), e.fillDragParams(r, t);
          });
        Qr(
          t,
          "onBeforeRenderGroup",
          Kr(t, n, {
            isPinch: !!n.isPinch,
            targets: t.props.targets,
            events: o,
          })
        );
      },
      dragGroupEnd: function (t, n) {
        this.dragEnd(t, n),
          Qr(
            t,
            "onBeforeRenderGroupEnd",
            Kr(t, n, {
              isPinch: !!n.isPinch,
              isDrag: n.isDrag,
              targets: t.props.targets,
            })
          );
      },
      dragControlStart: function (t, n) {
        return this.dragStart(t, n);
      },
      dragControl: function (t, n) {
        return this.drag(t, n);
      },
      dragControlEnd: function (t, n) {
        return this.dragEnd(t, n);
      },
      dragGroupControlStart: function (t, n) {
        return this.dragGroupStart(t, n);
      },
      dragGroupControl: function (t, n) {
        return this.dragGroup(t, n);
      },
      dragGroupControlEnd: function (t, n) {
        return this.dragGroupEnd(t, n);
      },
    },
    Xa = {
      name: "Renderable",
      props: {},
      events: {
        onRenderStart: "renderStart",
        onRender: "render",
        onRenderEnd: "renderEnd",
        onRenderGroupStart: "renderGroupStart",
        onRenderGroup: "renderGroup",
        onRenderGroupEnd: "renderGroupEnd",
      },
      dragStart: function (t, n) {
        Qr(t, "onRenderStart", Kr(t, n, { isPinch: !!n.isPinch }));
      },
      drag: function (t, n) {
        Qr(t, "onRender", Kr(t, n, { isPinch: !!n.isPinch }));
      },
      dragEnd: function (t, n) {
        Qr(
          t,
          "onRenderEnd",
          Kr(t, n, { isPinch: !!n.isPinch, isDrag: n.isDrag })
        );
      },
      dragGroupStart: function (t, n) {
        Qr(
          t,
          "onRenderGroupStart",
          Kr(t, n, { isPinch: !!n.isPinch, targets: t.props.targets })
        );
      },
      dragGroup: function (t, n) {
        Qr(
          t,
          "onRenderGroup",
          Kr(t, n, { isPinch: !!n.isPinch, targets: t.props.targets })
        );
      },
      dragGroupEnd: function (t, n) {
        Qr(
          t,
          "onRenderGroupEnd",
          Kr(t, n, {
            isPinch: !!n.isPinch,
            isDrag: n.isDrag,
            targets: t.props.targets,
          })
        );
      },
      dragControlStart: function (t, n) {
        return this.dragStart(t, n);
      },
      dragControl: function (t, n) {
        return this.drag(t, n);
      },
      dragControlEnd: function (t, n) {
        return this.dragEnd(t, n);
      },
      dragGroupControlStart: function (t, n) {
        return this.dragGroupStart(t, n);
      },
      dragGroupControl: function (t, n) {
        return this.dragGroup(t, n);
      },
      dragGroupControlEnd: function (t, n) {
        return this.dragGroupEnd(t, n);
      },
    };
  function $a(t, n, e, r, i, o, a) {
    var s = "Start" === i,
      u = t.state.target,
      l = o.isRequest;
    if (
      !u ||
      (s &&
        r.indexOf("Control") > -1 &&
        !l &&
        t.areaElement === o.inputEvent.target)
    )
      return !1;
    var c = "" + e + r + i,
      f = "" + e + r + "Condition",
      p = "End" === i,
      d = i.indexOf("After") > -1,
      h =
        s &&
        (!t.targetGesto ||
          !t.controlGesto ||
          !t.targetGesto.isFlag() ||
          !t.controlGesto.isFlag());
    h && t.updateRect(i, !0, !1), "" !== i || d || l || si(t.state, o);
    var g = r.indexOf("Group") > -1,
      v = er([Ya], t[n].slice(), [Xa]);
    if (l) {
      var m = o.requestAble;
      v.some(function (t) {
        return t.name === m;
      }) ||
        v.push.apply(
          v,
          t.props.ables.filter(function (t) {
            return t.name === m;
          })
        );
    }
    if (!v.length) return !1;
    var b = v.filter(function (t) {
        return t[c];
      }),
      x = o.datas;
    h &&
      b.forEach(function (n) {
        n.unset && n.unset(t);
      });
    var y,
      E = o.inputEvent;
    p && E && (y = document.elementFromPoint(o.clientX, o.clientY) || E.target);
    var S = b.filter(function (n) {
        var e = n.name,
          r = x[e] || (x[e] = {});
        return (
          s && (r.isEventStart = !n[f] || n[f](o, t)),
          !!r.isEventStart &&
            n[c](
              t,
              nr(nr({}, o), { datas: r, originalDatas: x, inputTarget: y })
            )
        );
      }),
      w = S.length,
      M = s && b.length && !w;
    return (
      (p || M) &&
        ((t.state.gesto = null),
        t.moveables &&
          t.moveables.forEach(function (t) {
            t.state.gesto = null;
          })),
      h &&
        M &&
        b.forEach(function (n) {
          n.unset && n.unset(t);
        }),
      !t.isUnmounted &&
        !M &&
        (((!s && w && !a) || p) &&
          (S.some(function (t) {
            return t.updateRect;
          }) && !g
            ? t.updateRect(i, !1, !1)
            : t.updateRect(i, !0, !1),
          t.forceUpdate()),
        s || p || d || !w || a || $a(t, n, e, r, i + "After", o),
        !0)
    );
  }
  function La(t, n, e) {
    var r = t.controlBox.getElement(),
      i = [];
    i.push(r), (t.props.dragArea && !t.props.dragTarget) || i.push(n);
    var o = function (n) {
      var e = n.inputEvent.target;
      return (
        e === t.areaElement ||
        !t.isMoveableElement(e) ||
        Kt(e, "moveable-area") ||
        Kt(e, "moveable-padding")
      );
    };
    return qa(t, i, "targetAbles", e, { dragStart: o, pinchStart: o });
  }
  function qa(t, n, e, r, i) {
    void 0 === i && (i = {});
    var o = t.props,
      a = o.pinchOutside,
      s = o.pinchThreshold,
      u = { container: window, pinchThreshold: s, pinchOutside: a },
      l = new Le(n, u);
    return (
      ["drag", "pinch"].forEach(function (n) {
        ["Start", "", "End"].forEach(function (o) {
          l.on("" + n + o, function (a) {
            var s = a.eventType;
            !i[s] || i[s](a) ? $a(t, e, n, r, o, a) || a.stop() : a.stop();
          });
        });
      }),
      l
    );
  }
  var Va = (function () {
      function t(t, n, e) {
        var r = this;
        (this.target = t),
          (this.moveable = n),
          (this.eventName = e),
          (this.ables = []),
          (this.onEvent = function (t) {
            var n = r.eventName,
              e = r.moveable;
            r.ables.forEach(function (r) {
              r[n]({ inputEvent: t }, e);
            });
          }),
          this.target.addEventListener(
            this.eventName.toLowerCase(),
            this.onEvent
          );
      }
      var n = t.prototype;
      return (
        (n.setAbles = function (t) {
          this.ables = t;
        }),
        (n.destroy = function () {
          this.target.removeEventListener(
            this.eventName.toLowerCase(),
            this.onEvent
          ),
            (this.target = null),
            (this.moveable = null);
        }),
        t
      );
    })(),
    Wa = (function (t) {
      function n() {
        var n = (null !== t && t.apply(this, arguments)) || this;
        return (
          (n.state = nr(
            {
              container: null,
              target: null,
              gesto: null,
              renderPoses: [
                [0, 0],
                [0, 0],
                [0, 0],
                [0, 0],
              ],
            },
            $r(null)
          )),
          (n.enabledAbles = []),
          (n.targetAbles = []),
          (n.controlAbles = []),
          (n.rotation = 0),
          (n.scale = [1, 1]),
          (n.isUnmounted = !1),
          (n.events = { mouseEnter: null, mouseLeave: null }),
          n
        );
      }
      tr(n, t);
      var e = n.prototype;
      return (
        (e.render = function () {
          var t = this.props,
            n = this.state,
            e = t.edge,
            r = t.parentPosition,
            i = t.className,
            o = t.target,
            a = t.zoom,
            s = t.cspNonce,
            u = t.translateZ,
            l = t.cssStyled,
            c = t.portalContainer;
          this.checkUpdate(), this.updateRenderPoses();
          var f = r || { left: 0, top: 0 },
            p = f.left,
            d = f.top,
            h = n.left,
            g = n.top,
            v = n.target,
            m = n.direction,
            b = n.renderPoses,
            x = t.targets,
            y = ((x && x.length) || o) && v,
            E = this.isDragging(),
            S = {},
            w = { createElement: dn };
          return (
            this.getEnabledAbles().forEach(function (t) {
              S["data-able-" + t.name.toLowerCase()] = !0;
            }),
            dn(
              l,
              nr(
                {
                  cspNonce: s,
                  ref: ht(this, "controlBox"),
                  className:
                    xr(
                      "control-box",
                      -1 === m ? "reverse" : "",
                      E ? "dragging" : ""
                    ) +
                    " " +
                    i,
                },
                S,
                {
                  portalContainer: c,
                  style: {
                    position: "absolute",
                    display: y ? "block" : "none",
                    transform:
                      "translate3d(" +
                      (h - p) +
                      "px, " +
                      (g - d) +
                      "px, " +
                      u +
                      ")",
                    "--zoom": a,
                    "--zoompx": a + "px",
                  },
                }
              ),
              this.renderAbles(),
              Ho(w, e ? "n" : "", b[0], b[1], a, 0),
              Ho(w, e ? "e" : "", b[1], b[3], a, 1),
              Ho(w, e ? "w" : "", b[0], b[2], a, 2),
              Ho(w, e ? "s" : "", b[2], b[3], a, 3)
            )
          );
        }),
        (e.componentDidMount = function () {
          this.controlBox.getElement();
          var t = this.props,
            n = t.parentMoveable,
            e = t.container,
            r = t.wrapperMoveable;
          this.updateEvent(t),
            this.updateNativeEvents(t),
            e || n || r || this.updateRect("", !1, !0),
            this.updateCheckInput();
        }),
        (e.componentDidUpdate = function (t) {
          this.updateNativeEvents(t),
            this.updateEvent(t),
            this.updateCheckInput();
        }),
        (e.componentWillUnmount = function () {
          (this.isUnmounted = !0),
            Zr(this, "targetGesto"),
            Zr(this, "controlGesto");
          var t = this.events;
          for (var n in t) {
            var e = t[n];
            e && e.destroy();
          }
        }),
        (e.getContainer = function () {
          var t = this.props,
            n = t.parentMoveable,
            e = t.wrapperMoveable;
          return (
            t.container ||
            (e && e.getContainer()) ||
            (n && n.getContainer()) ||
            this.controlBox.getElement().parentElement
          );
        }),
        (e.isMoveableElement = function (t) {
          return t && (t.getAttribute("class") || "").indexOf(ur) > -1;
        }),
        (e.dragStart = function (t) {
          return this.targetGesto && this.targetGesto.triggerDragStart(t), this;
        }),
        (e.hitTest = function (t) {
          var n,
            e = this.state,
            r = e.target,
            i = e.pos1,
            o = e.pos2,
            a = e.pos3,
            s = e.pos4,
            u = e.targetClientRect;
          if (!r) return 0;
          if (t instanceof Element) {
            var l = t.getBoundingClientRect();
            n = { left: l.left, top: l.top, width: l.width, height: l.height };
          } else n = nr({ width: 0, height: 0 }, t);
          var c = n.left,
            f = n.top,
            p = n.width,
            d = n.height,
            h = me([i, o, s, a], u),
            g = Me(h, [
              [c, f],
              [c + p, f],
              [c + p, f + d],
              [c, f + d],
            ]),
            v = ve(h);
          return g && v ? Math.min(100, (g / v) * 100) : 0;
        }),
        (e.isInside = function (t, n) {
          var e = this.state,
            r = e.target,
            i = e.pos1,
            o = e.pos2,
            a = e.pos3,
            s = e.pos4,
            u = e.targetClientRect;
          return !!r && xe([t, n], me([i, o, s, a], u));
        }),
        (e.updateRect = function (t, n, e) {
          void 0 === e && (e = !0);
          var r = this.props,
            i = r.parentMoveable,
            o = this.state.target || this.props.target,
            a = this.getContainer(),
            s = i ? i.props.rootContainer : r.rootContainer;
          this.updateState(
            $r(
              this.controlBox && this.controlBox.getElement(),
              o,
              a,
              a,
              s || a
            ),
            !i && e
          );
        }),
        (e.isTargetChanged = function (t, n) {
          var e = this.props,
            r = e.dragTarget || e.target,
            i = t.dragTarget || t.target,
            o = e.dragArea,
            a = t.dragArea;
          return (!o && i !== r) || ((n || o) && a !== o);
        }),
        (e.updateNativeEvents = function (t) {
          var n = this,
            e = this.props.dragArea ? this.areaElement : this.state.target,
            r = this.events,
            i = Xt(r);
          if (this.isTargetChanged(t))
            for (var o in r) {
              var a = r[o];
              a && a.destroy(), (r[o] = null);
            }
          if (e) {
            var s = this.enabledAbles;
            i.forEach(function (t) {
              var i = ni(s, [t]),
                o = i.length > 0,
                a = r[t];
              o
                ? (a || ((a = new Va(e, n, t)), (r[t] = a)), a.setAbles(i))
                : a && (a.destroy(), (r[t] = null));
            });
          }
        }),
        (e.updateEvent = function (t) {
          var n = this.controlBox.getElement(),
            e = this.targetAbles.length,
            r = this.controlAbles.length,
            i = this.props,
            o = i.dragTarget || i.target,
            a = this.isTargetChanged(t, !0),
            s = (!e && this.targetGesto) || a;
          s && (Zr(this, "targetGesto"), this.updateState({ gesto: null })),
            r || Zr(this, "controlGesto"),
            o && e && !this.targetGesto && (this.targetGesto = La(this, o, "")),
            !this.controlGesto &&
              r &&
              (this.controlGesto = qa(this, n, "controlAbles", "Control")),
            s && this.unsetAbles();
        }),
        (e.isDragging = function () {
          return (
            (!!this.targetGesto && this.targetGesto.isFlag()) ||
            (!!this.controlGesto && this.controlGesto.isFlag())
          );
        }),
        (e.updateTarget = function (t) {
          this.updateRect(t, !0);
        }),
        (e.getRect = function () {
          var t = this.state,
            n = Wr(this.state),
            e = n[0],
            r = n[1],
            i = n[2],
            o = n[3],
            a = _r(n),
            s = t.width,
            u = t.height,
            l = a.width,
            c = a.height,
            f = a.left,
            p = a.top,
            d = [t.left, t.top],
            h = Jn(d, t.origin);
          return {
            width: l,
            height: c,
            left: f,
            top: p,
            pos1: e,
            pos2: r,
            pos3: i,
            pos4: o,
            offsetWidth: s,
            offsetHeight: u,
            beforeOrigin: Jn(d, t.beforeOrigin),
            origin: h,
            transformOrigin: t.transformOrigin,
            rotation: this.getRotation(),
          };
        }),
        (e.getManager = function () {
          return this;
        }),
        (e.getRotation = function () {
          var t = this.state;
          return (function (t, n, e) {
            var r = (Ht(t, n) / Math.PI) * 180;
            return (r = e >= 0 ? r : 180 - r) >= 0 ? r : 360 + r;
          })(t.pos1, t.pos2, t.direction);
        }),
        (e.request = function (t, n, e) {
          void 0 === n && (n = {});
          var r = this.props,
            i = r.ables,
            o = r.groupable,
            a = i.filter(function (n) {
              return n.name === t;
            })[0];
          if (this.isDragging() || !a || !a.request)
            return {
              request: function () {
                return this;
              },
              requestEnd: function () {
                return this;
              },
            };
          var s = this,
            u = a.request(this),
            l = e || n.isInstant,
            c = u.isControl ? "controlAbles" : "targetAbles",
            f = (o ? "Group" : "") + (u.isControl ? "Control" : ""),
            p = {
              request: function (n) {
                return (
                  $a(
                    s,
                    c,
                    "drag",
                    f,
                    "",
                    nr(nr({}, u.request(n)), { requestAble: t, isRequest: !0 }),
                    l
                  ),
                  this
                );
              },
              requestEnd: function () {
                return (
                  $a(
                    s,
                    c,
                    "drag",
                    f,
                    "End",
                    nr(nr({}, u.requestEnd()), {
                      requestAble: t,
                      isRequest: !0,
                    }),
                    l
                  ),
                  this
                );
              },
            };
          return (
            $a(
              s,
              c,
              "drag",
              f,
              "Start",
              nr(nr({}, u.requestStart(n)), { requestAble: t, isRequest: !0 }),
              l
            ),
            l ? p.request(n).requestEnd() : p
          );
        }),
        (e.destroy = function () {
          this.componentWillUnmount();
        }),
        (e.updateRenderPoses = function () {
          var t = this.state,
            n = this.props,
            e = t.originalBeforeOrigin,
            r = t.transformOrigin,
            i = t.allMatrix,
            o = t.is3d,
            a = t.pos1,
            s = t.pos2,
            u = t.pos3,
            l = t.pos4,
            c = t.left,
            f = t.top,
            p = n.padding || {},
            d = p.left,
            h = void 0 === d ? 0 : d,
            g = p.top,
            v = void 0 === g ? 0 : g,
            m = p.bottom,
            b = void 0 === m ? 0 : m,
            x = p.right,
            y = void 0 === x ? 0 : x,
            E = o ? 4 : 3,
            S = n.groupable ? e : Jn(e, [c, f]);
          t.renderPoses = [
            Jn(a, ui(i, [-h, -v], r, S, E)),
            Jn(s, ui(i, [y, -v], r, S, E)),
            Jn(u, ui(i, [-h, b], r, S, E)),
            Jn(l, ui(i, [y, b], r, S, E)),
          ];
        }),
        (e.checkUpdate = function () {
          var t = this.props,
            n = t.target,
            e = t.container,
            r = t.parentMoveable,
            i = this.state,
            o = i.target,
            a = i.container;
          (o || n) &&
            (this.updateAbles(),
            (!ei(o, n) || !ei(a, e)) &&
              (this.updateState({ target: n, container: e }),
              r || (!e && !this.controlBox) || this.updateRect("End", !1, !1)));
        }),
        (e.triggerEvent = function (t, n) {
          var e = this.props[t];
          return e && e(n);
        }),
        (e.useCSS = function (t, n) {
          var e = this.props.customStyledMap,
            r = t + n;
          return e[r] || (e[r] = Je(t, n)), e[r];
        }),
        (e.unsetAbles = function () {
          var t = this;
          this.targetAbles.filter(function (n) {
            return !!n.unset && (n.unset(t), !0);
          }).length && this.forceUpdate();
        }),
        (e.updateAbles = function (t, n) {
          void 0 === t && (t = this.props.ables), void 0 === n && (n = "");
          var e = this.props,
            r = e.triggerAblesSimultaneously,
            i = t.filter(function (t) {
              return t && (t.always || e[t.name]);
            }),
            o = "drag" + n + "ControlStart",
            a = ni(i, ["drag" + n + "Start", "pinch" + n + "Start"], r),
            s = ni(i, [o], r);
          (this.enabledAbles = i),
            (this.targetAbles = a),
            (this.controlAbles = s);
        }),
        (e.updateState = function (t, n) {
          if (n) this.setState(t);
          else {
            var e = this.state;
            for (var r in t) e[r] = t[r];
          }
        }),
        (e.getEnabledAbles = function () {
          var t = this.props;
          return t.ables.filter(function (n) {
            return n && t[n.name];
          });
        }),
        (e.renderAbles = function () {
          var t,
            n,
            e,
            r,
            i = this,
            o = this.props.triggerAblesSimultaneously,
            a = { createElement: dn };
          return ((t = ii(
            ni(this.getEnabledAbles(), ["render"], o).map(function (t) {
              return (0, t.render)(i, a) || [];
            })
          ).filter(function (t) {
            return t;
          })),
          (n = function (t) {
            return t.key;
          }),
          (e = []),
          (r = {}),
          t.forEach(function (i, o) {
            var a = n(i, o, t),
              s = r[a];
            s || ((s = []), (r[a] = s), e.push(s)), s.push(i);
          }),
          e).map(function (t) {
            return t[0];
          });
        }),
        (e.updateCheckInput = function () {
          this.targetGesto &&
            (this.targetGesto.options.checkInput = this.props.checkInput);
        }),
        (n.defaultProps = {
          target: null,
          dragTarget: null,
          container: null,
          rootContainer: null,
          origin: !0,
          edge: !1,
          parentMoveable: null,
          wrapperMoveable: null,
          parentPosition: null,
          portalContainer: null,
          ables: [],
          pinchThreshold: 20,
          dragArea: !1,
          passDragArea: !1,
          transformOrigin: "",
          className: "",
          zoom: 1,
          triggerAblesSimultaneously: !1,
          padding: {},
          pinchOutside: !0,
          checkInput: !1,
          groupable: !1,
          cspNonce: "",
          translateZ: 0,
          cssStyled: null,
          customStyledMap: {},
          props: {},
        }),
        n
      );
    })(Mn),
    Ha = {
      name: "groupable",
      props: {
        defaultGroupRotate: Number,
        defaultGroupOrigin: String,
        groupable: Boolean,
      },
      events: {},
      render: function (t, n) {
        var e = t.props.targets || [];
        t.moveables = [];
        var r = t.state,
          i = { left: r.left, top: r.top };
        return e.map(function (e, r) {
          return n.createElement(Wa, {
            key: "moveable" + r,
            ref: gt(t, "moveables", r),
            target: e,
            origin: !1,
            cssStyled: t.props.cssStyled,
            customStyledMap: t.props.customStyledMap,
            parentMoveable: t,
            parentPosition: i,
          });
        });
      },
    };
  function Ua(t) {
    var n = t.originalDatas.draggable;
    return (
      n || ((t.originalDatas.draggable = {}), (n = t.originalDatas.draggable)),
      nr(nr({}, t), { datas: n })
    );
  }
  var Za = {
      name: "edgeDraggable",
      props: { edgeDraggable: Boolean },
      events: {},
      dragControlCondition: function (t, n) {
        if (!n.props.edgeDraggable || !t.inputEvent) return !1;
        var e = t.inputEvent.target;
        return Kt(e, xr("direction")) && Kt(e, xr("line"));
      },
      dragControlStart: function (t, n) {
        return Vo.dragStart(t, Ua(n));
      },
      dragControl: function (t, n) {
        return Vo.drag(t, Ua(n));
      },
      dragControlEnd: function (t, n) {
        return Vo.dragEnd(t, Ua(n));
      },
      dragGroupControlCondition: function (t, n) {
        if (!n.props.edgeDraggable || !t.inputEvent) return !1;
        var e = t.inputEvent.target;
        return Kt(e, xr("direction")) && Kt(e, xr("line"));
      },
      dragGroupControlStart: function (t, n) {
        return Vo.dragGroupStart(t, Ua(n));
      },
      dragGroupControl: function (t, n) {
        return Vo.dragGroup(t, Ua(n));
      },
      dragGroupControlEnd: function (t, n) {
        return Vo.dragGroupEnd(t, Ua(n));
      },
      unset: function (t) {
        t.state.dragInfo = null;
      },
    },
    Ka = {
      name: "individualGroupable",
      props: { individualGroupable: Boolean },
      events: {},
    },
    Ja = [
      Ya,
      ma,
      qo,
      vi,
      Vo,
      Za,
      ea,
      ra,
      ia,
      sa,
      va,
      ba,
      ha,
      Ia,
      Aa,
      Fa,
      Ha,
      Ka,
      {
        name: "clickable",
        props: {},
        events: { onClick: "click", onClickGroup: "clickGroup" },
        always: !0,
        dragStart: function () {},
        dragGroupStart: function (t, n) {
          n.datas.inputTarget = n.inputEvent && n.inputEvent.target;
        },
        dragEnd: function (t, n) {
          var e = t.state.target,
            r = n.inputEvent,
            i = n.inputTarget;
          if (r && i && !n.isDrag && !t.isMoveableElement(i)) {
            var o = e.contains(i);
            Qr(
              t,
              "onClick",
              Kr(t, n, {
                isDouble: n.isDouble,
                inputTarget: i,
                isTarget: e === i,
                containsTarget: o,
              })
            );
          }
        },
        dragGroupEnd: function (t, n) {
          var e = n.inputEvent,
            r = n.inputTarget;
          if (
            e &&
            r &&
            !n.isDrag &&
            !t.isMoveableElement(r) &&
            n.datas.inputTarget !== r
          ) {
            var i = t.props.targets,
              o = i.indexOf(r),
              a = o > -1,
              s = !1;
            -1 === o &&
              (s =
                (o = Yt(i, function (t) {
                  return t.contains(r);
                })) > -1),
              Qr(
                t,
                "onClickGroup",
                Kr(t, n, {
                  isDouble: n.isDouble,
                  targets: i,
                  inputTarget: r,
                  targetIndex: o,
                  isTarget: a,
                  containsTarget: s,
                })
              );
          }
        },
      },
      da,
      Xa,
    ],
    Qa = Ja.reduce(function (t, n) {
      return nr(nr({}, t), n.events);
    }, {}),
    ts = Ja.reduce(function (t, n) {
      return nr(nr({}, t), n.props);
    }, {}),
    ns = pi(Qa),
    es = Object.keys(ns),
    rs = Object.keys(ts);
  function is(t, n) {
    return Math.max.apply(
      Math,
      t.map(function (t) {
        var e = t[0],
          r = t[1],
          i = t[2],
          o = t[3];
        return Math.max(e[n], r[n], i[n], o[n]);
      })
    );
  }
  function os(t, n) {
    return Math.min.apply(
      Math,
      t.map(function (t) {
        var e = t[0],
          r = t[1],
          i = t[2],
          o = t[3];
        return Math.min(e[n], r[n], i[n], o[n]);
      })
    );
  }
  var as = (function (t) {
      function n() {
        var n = (null !== t && t.apply(this, arguments)) || this;
        return (
          (n.differ = new Oe()),
          (n.moveables = []),
          (n.transformOrigin = "50% 50%"),
          n
        );
      }
      tr(n, t);
      var e = n.prototype;
      return (
        (e.updateEvent = function (t) {
          var n = this.state,
            e = this.props,
            r = t.dragTarget || n.target,
            i = e.dragTarget || this.areaElement;
          r !== i &&
            (Zr(this, "targetGesto"),
            Zr(this, "controlGesto"),
            (n.target = null)),
            n.target ||
              ((n.target = this.areaElement),
              (this.controlBox.getElement().style.display = "block"),
              (this.targetGesto = La(this, i, "Group")),
              (this.controlGesto = qa(
                this,
                this.controlBox.getElement(),
                "controlAbles",
                "GroupControl"
              )));
          var o = !ei(t.container, e.container);
          o && (n.container = e.container);
          var a = this.differ.update(e.targets),
            s = a.added,
            u = a.changed,
            l = a.removed;
          (o || s.length || u.length || l.length) && this.updateRect();
        }),
        (e.checkUpdate = function () {
          this.updateAbles();
        }),
        (e.updateRect = function (t, n, e) {
          if ((void 0 === e && (e = !0), this.controlBox)) {
            this.moveables.forEach(function (n) {
              n.updateRect(t, !1, !1);
            });
            var r = this.state,
              i = this.props,
              o = r.target || i.target;
            (!n || ("" !== t && i.updateGroup)) &&
              ((this.rotation = i.defaultGroupRotate),
              (this.transformOrigin = i.defaultGroupOrigin || "50% 50%"),
              (this.scale = [1, 1]));
            var a = this.rotation,
              s = this.scale,
              u = (function (t, n) {
                if (!t.length) return [0, 0, 0, 0];
                var e = t.map(function (t) {
                    return Wr(t.state);
                  }),
                  r = dr,
                  i = dr,
                  o = 0,
                  a = 0,
                  s = Hr(n, fr);
                if (s % 90) {
                  var u = (s / 180) * Math.PI,
                    l = Math.tan(u),
                    c = -1 / l,
                    f = [hr, dr],
                    p = [hr, dr];
                  e.forEach(function (t) {
                    t.forEach(function (t) {
                      var n = t[1] - l * t[0],
                        e = t[1] - c * t[0];
                      (f[0] = Math.max(f[0], n)),
                        (f[1] = Math.min(f[1], n)),
                        (p[0] = Math.max(p[0], e)),
                        (p[1] = Math.min(p[1], e));
                    });
                  }),
                    f.forEach(function (t) {
                      p.forEach(function (n) {
                        var e = (n - t) / (l - c),
                          o = l * e + t;
                        (r = Math.min(r, e)), (i = Math.min(i, o));
                      });
                    });
                  var d = e.map(function (t) {
                    var n = t[0],
                      e = t[1],
                      r = t[2],
                      i = t[3];
                    return [ae(n, -u), ae(e, -u), ae(r, -u), ae(i, -u)];
                  });
                  (o = is(d, 0) - os(d, 0)), (a = is(d, 1) - os(d, 1));
                } else if (
                  ((r = os(e, 0)),
                  (i = os(e, 1)),
                  (o = is(e, 0) - r),
                  (a = is(e, 1) - i),
                  s % 180)
                ) {
                  var h = o;
                  (o = a), (a = h);
                }
                return [r, i, o, a];
              })(this.moveables, a),
              l = u[0],
              c = u[1],
              f = u[2],
              p = u[3],
              d =
                "rotate(" +
                a +
                "deg) scale(" +
                (s[0] >= 0 ? 1 : -1) +
                ", " +
                (s[1] >= 0 ? 1 : -1) +
                ")";
            (o.style.cssText +=
              "left:0px;top:0px; transform-origin: " +
              this.transformOrigin +
              "; width:" +
              f +
              "px; height:" +
              p +
              "px;transform:" +
              d),
              (r.width = f),
              (r.height = p);
            var h = this.getContainer(),
              g = $r(
                this.controlBox.getElement(),
                o,
                this.controlBox.getElement(),
                this.getContainer(),
                this.props.rootContainer || h
              ),
              v = [g.left, g.top],
              m = Wr(g),
              b = m[0],
              x = m[1],
              y = m[2],
              E = m[3],
              S = be([b, x, y, E]),
              w = [S.minX, S.minY];
            (g.pos1 = Qn(b, w)),
              (g.pos2 = Qn(x, w)),
              (g.pos3 = Qn(y, w)),
              (g.pos4 = Qn(E, w)),
              (g.left = l - g.left + w[0]),
              (g.top = c - g.top + w[1]),
              (g.origin = Qn(Jn(v, g.origin), w)),
              (g.beforeOrigin = Qn(Jn(v, g.beforeOrigin), w)),
              (g.originalBeforeOrigin = Jn(v, g.originalBeforeOrigin));
            var M = g.targetClientRect,
              C = s[0] * s[1] > 0 ? 1 : -1;
            (M.top += g.top - r.top),
              (M.left += g.left - r.left),
              (o.style.transform =
                "translate(" + -w[0] + "px, " + -w[1] + "px) " + d),
              this.updateState(
                nr(nr({}, g), { direction: C, beforeDirection: C }),
                e
              );
          }
        }),
        (e.getRect = function () {
          return nr(nr({}, t.prototype.getRect.call(this)), {
            children: this.moveables.map(function (t) {
              return t.getRect();
            }),
          });
        }),
        (e.triggerEvent = function (n, e, r) {
          if (r || n.indexOf("Group") > -1)
            return t.prototype.triggerEvent.call(this, n, e);
        }),
        (e.updateAbles = function () {
          t.prototype.updateAbles.call(
            this,
            er(this.props.ables, [Ha]),
            "Group"
          );
        }),
        (n.defaultProps = nr(nr({}, Wa.defaultProps), {
          transformOrigin: ["50%", "50%"],
          groupable: !0,
          dragArea: !0,
          keepRatio: !0,
          targets: [],
          defaultGroupRotate: 0,
          defaultGroupOrigin: "50% 50%",
        })),
        n
      );
    })(Wa),
    ss = (function (t) {
      function n() {
        var n = (null !== t && t.apply(this, arguments)) || this;
        return (n.moveables = []), n;
      }
      tr(n, t);
      var e = n.prototype;
      return (
        (e.render = function () {
          var t = this,
            n = this.props,
            e = n.cspNonce,
            r = n.cssStyled,
            i = n.targets;
          return dn(
            r,
            {
              cspNonce: e,
              ref: ht(this, "controlBox"),
              className: xr("control-box"),
            },
            i.map(function (n, e) {
              return dn(
                Wa,
                nr(
                  { key: "moveable" + e, ref: gt(t, "moveables", e) },
                  t.props,
                  { target: n, wrapperMoveable: t }
                )
              );
            })
          );
        }),
        (e.componentDidUpdate = function () {}),
        (e.updateRect = function (t, n, e) {
          void 0 === e && (e = !0),
            this.moveables.forEach(function (r) {
              r.updateRect(t, n, e);
            });
        }),
        (e.getRect = function () {
          return nr(nr({}, t.prototype.getRect.call(this)), {
            children: this.moveables.map(function (t) {
              return t.getRect();
            }),
          });
        }),
        (e.request = function () {
          return {
            request: function () {
              return this;
            },
            requestEnd: function () {
              return this;
            },
          };
        }),
        (e.dragStart = function () {
          return this;
        }),
        (e.hitTest = function () {
          return 0;
        }),
        (e.isInside = function () {
          return !1;
        }),
        (e.isDragging = function () {
          return !1;
        }),
        (e.updateRenderPoses = function () {}),
        (e.updateEvent = function () {}),
        (e.checkUpdate = function () {}),
        (e.triggerEvent = function () {}),
        (e.updateAbles = function () {}),
        n
      );
    })(Wa),
    us = (function (t) {
      function n() {
        return (null !== t && t.apply(this, arguments)) || this;
      }
      return tr(n, t), (n.defaultAbles = Ja), n;
    })(
      (function (t) {
        function n() {
          var n = (null !== t && t.apply(this, arguments)) || this;
          return (n.refTargets = []), (n.selectorMap = {}), n;
        }
        tr(n, t);
        var e,
          r,
          i = n.prototype;
        return (
          (n.makeStyled = function () {
            var t = {};
            this.getTotalAbles().forEach(function (n) {
              var e = n.css;
              e &&
                e.forEach(function (n) {
                  t[n] = !0;
                });
            });
            var n = Xt(t).join("\n");
            this.defaultStyled = Je(
              "div",
              (function (t, n) {
                return n.replace(/([^}{]*){/gm, function (n, e) {
                  return e.replace(/\.([^{,\s\d.]+)/g, "." + t + "$1") + "{";
                });
              })(ur, lr + n)
            );
          }),
          (n.getTotalAbles = function () {
            return er([ma, Ha, Ka, da], this.defaultAbles);
          }),
          (i.render = function () {
            var t = this.constructor;
            t.defaultStyled || t.makeStyled();
            var n = this.props,
              e = n.ables,
              r = n.props,
              i = (function (t, n) {
                var e = {};
                for (var r in t)
                  Object.prototype.hasOwnProperty.call(t, r) &&
                    n.indexOf(r) < 0 &&
                    (e[r] = t[r]);
                if (
                  null != t &&
                  "function" == typeof Object.getOwnPropertySymbols
                ) {
                  var i = 0;
                  for (r = Object.getOwnPropertySymbols(t); i < r.length; i++)
                    n.indexOf(r[i]) < 0 &&
                      Object.prototype.propertyIsEnumerable.call(t, r[i]) &&
                      (e[r[i]] = t[r[i]]);
                }
                return e;
              })(n, ["ables", "props"]),
              o = hi(i.target || i.targets),
              a = (function (t, n) {
                var e = [];
                return (
                  t.forEach(function (t) {
                    t && (zt(t) ? n[t] && e.push.apply(e, n[t]) : e.push(t));
                  }),
                  e
                );
              })(o, this.selectorMap);
            this.refTargets = o;
            var s = a.length > 1,
              u = er(t.getTotalAbles(), e || []),
              l = nr(nr(nr({}, i), r || {}), {
                ables: u,
                cssStyled: t.defaultStyled,
                customStyledMap: t.customStyledMap,
              });
            return s
              ? i.individualGroupable
                ? dn(
                    ss,
                    nr(
                      { key: "individual-group", ref: ht(this, "moveable") },
                      l,
                      { target: null, targets: a }
                    )
                  )
                : dn(
                    as,
                    nr({ key: "group", ref: ht(this, "moveable") }, l, {
                      target: null,
                      targets: a,
                    })
                  )
              : dn(
                  Wa,
                  nr({ key: "single", ref: ht(this, "moveable") }, l, {
                    target: a[0],
                  })
                );
          }),
          (i.componentDidMount = function () {
            this.updateRefs();
          }),
          (i.componentDidUpdate = function () {
            this.updateRefs();
          }),
          (i.updateRefs = function (t) {
            var n = hi(this.props.target || this.props.targets),
              e = this.refTargets.some(function (t, e) {
                var r = n[e];
                return !(!t && !r) && t !== r;
              }),
              r = t ? {} : this.selectorMap,
              i = {};
            this.refTargets.forEach(function (t) {
              zt(t) &&
                (r[t]
                  ? (i[t] = r[t])
                  : ((e = !0),
                    (i[t] = [].slice.call(document.querySelectorAll(t)))));
            }),
              (this.selectorMap = i),
              e && this.forceUpdate();
          }),
          (i.getManager = function () {
            return this.moveable;
          }),
          (n.defaultAbles = []),
          (n.customStyledMap = {}),
          (n.defaultStyled = null),
          (function (t, n, e, r) {
            var i,
              o = arguments.length,
              a =
                o < 3
                  ? n
                  : null === r
                  ? (r = Object.getOwnPropertyDescriptor(n, e))
                  : r;
            if (
              "object" == typeof Reflect &&
              "function" == typeof Reflect.decorate
            )
              a = Reflect.decorate(t, n, e, r);
            else
              for (var s = t.length - 1; s >= 0; s--)
                (i = t[s]) &&
                  (a = (o < 3 ? i(a) : o > 3 ? i(n, e, a) : i(n, e)) || a);
            o > 3 && a && Object.defineProperty(n, e, a);
          })(
            [
              ((e = br),
              void 0 === r && (r = {}),
              function (t, n) {
                e.forEach(function (e) {
                  var i = r[e] || e;
                  t[i] ||
                    (t[i] = function () {
                      for (var t, r = [], i = 0; i < arguments.length; i++)
                        r[i] = arguments[i];
                      var o = (t = this[n])[e].apply(t, r);
                      return o === this[n] ? this : o;
                    });
                });
              }),
            ],
            n.prototype,
            "moveable",
            void 0
          ),
          n
        );
      })(Mn)
    ),
    ls = function (t, n) {
      return (ls =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, n) {
            t.__proto__ = n;
          }) ||
        function (t, n) {
          for (var e in n) n.hasOwnProperty(e) && (t[e] = n[e]);
        })(t, n);
    };
  function cs(t, n) {
    function e() {
      this.constructor = t;
    }
    ls(t, n),
      (t.prototype =
        null === n ? Object.create(n) : ((e.prototype = n.prototype), new e()));
  }
  var fs = function () {
    return (fs =
      Object.assign ||
      function (t) {
        for (var n, e = 1, r = arguments.length; e < r; e++)
          for (var i in (n = arguments[e]))
            Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
        return t;
      }).apply(this, arguments);
  };
  var ps = (function (t) {
      function n(n) {
        var e = t.call(this, n) || this;
        return (e.state = {}), (e.state = e.props), e;
      }
      return (
        cs(n, t),
        (n.prototype.render = function () {
          return (
            (t = dn(us, fs({ ref: ht(this, "moveable") }, this.state))),
            (n = this.state.parentElement),
            dn(Cn, { element: t, container: n })
          );
          var t, n;
        }),
        n
      );
    })(wn),
    ds = rs,
    hs = br,
    gs = es,
    vs = function () {
      return (vs =
        Object.assign ||
        function (t) {
          for (var n, e = 1, r = arguments.length; e < r; e++)
            for (var i in (n = arguments[e]))
              Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
          return t;
        }).apply(this, arguments);
    };
  var ms = (function (t) {
    function n() {
      return (null !== t && t.apply(this, arguments)) || this;
    }
    return cs(n, t), n;
  })(
    (function (t) {
      function n(n, e) {
        void 0 === e && (e = {});
        var r = t.call(this) || this;
        r.tempElement = document.createElement("div");
        var i = fs({ container: n || document.body }, e),
          o = {};
        gs.forEach(function (t) {
          o[jt("on " + t)] = function (n) {
            return r.trigger(t, n);
          };
        }),
          Pn(
            dn(ps, fs({ ref: ht(r, "innerMoveable"), parentElement: n }, i, o)),
            r.tempElement
          );
        var a = i.target;
        return Pt(a) && a.length > 1 && r.updateRect(), r;
      }
      cs(n, t);
      var e = n.prototype;
      return (
        (e.setState = function (t, n) {
          this.innerMoveable.setState(t, n);
        }),
        (e.destroy = function () {
          Pn(null, this.tempElement),
            this.off(),
            (this.tempElement = null),
            (this.innerMoveable = null);
        }),
        (e.getMoveable = function () {
          return this.innerMoveable.moveable;
        }),
        (n = (function (t, n, e, r) {
          var i,
            o = arguments.length,
            a =
              o < 3
                ? n
                : null === r
                ? (r = Object.getOwnPropertyDescriptor(n, e))
                : r;
          if (
            "object" == typeof Reflect &&
            "function" == typeof Reflect.decorate
          )
            a = Reflect.decorate(t, n, e, r);
          else
            for (var s = t.length - 1; s >= 0; s--)
              (i = t[s]) &&
                (a = (o < 3 ? i(a) : o > 3 ? i(n, e, a) : i(n, e)) || a);
          return o > 3 && a && Object.defineProperty(n, e, a), a;
        })(
          [
            vt(hs, function (t, n) {
              t[n] ||
                (t[n] = function () {
                  for (var t = [], e = 0; e < arguments.length; e++)
                    t[e] = arguments[e];
                  var r = this.getMoveable();
                  if (r && r[n]) return r[n].apply(r, t);
                });
            }),
            vt(ds, function (t, n) {
              Object.defineProperty(t, n, {
                get: function () {
                  return this.getMoveable().props[n];
                },
                set: function (t) {
                  var e;
                  this.setState((((e = {})[n] = t), e));
                },
                enumerable: !0,
                configurable: !0,
              });
            }),
          ],
          n
        ))
      );
    })(
      (function () {
        function t() {
          this._events = {};
        }
        var n = t.prototype;
        return (
          (n.on = function (t, n) {
            if (Ot(t)) for (var e in t) this.on(e, t[e]);
            else this._addEvent(t, n, {});
            return this;
          }),
          (n.off = function (t, n) {
            if (t)
              if (Ot(t)) for (var e in t) this.off(e);
              else if (n) {
                var r = this._events[t];
                if (r) {
                  var i = Yt(r, function (t) {
                    return t.listener === n;
                  });
                  i > -1 && r.splice(i, 1);
                }
              } else this._events[t] = [];
            else this._events = {};
            return this;
          }),
          (n.once = function (t, n) {
            var e = this;
            return (
              n && this._addEvent(t, n, { once: !0 }),
              new Promise(function (n) {
                e._addEvent(t, n, { once: !0 });
              })
            );
          }),
          (n.emit = function (t, n) {
            var e = this;
            void 0 === n && (n = {});
            var r = this._events[t];
            if (!t || !r) return !0;
            var i = !1;
            return (
              (n.eventType = t),
              (n.stop = function () {
                i = !0;
              }),
              (n.currentTarget = this),
              (function () {
                for (var t = 0, n = 0, e = arguments.length; n < e; n++)
                  t += arguments[n].length;
                var r = Array(t),
                  i = 0;
                for (n = 0; n < e; n++)
                  for (
                    var o = arguments[n], a = 0, s = o.length;
                    a < s;
                    a++, i++
                  )
                    r[i] = o[a];
                return r;
              })(r).forEach(function (r) {
                r.listener(n), r.once && e.off(t, r.listener);
              }),
              !i
            );
          }),
          (n.trigger = function (t, n) {
            return void 0 === n && (n = {}), this.emit(t, n);
          }),
          (n._addEvent = function (t, n, e) {
            var r = this._events;
            (r[t] = r[t] || []), r[t].push(vs({ listener: n }, e));
          }),
          t
        );
      })()
    )
  );
  function bs(t, n, r) {
    const i = (function () {
      const t = G();
      return (n, e) => {
        const r = t.$$.callbacks[n];
        if (r) {
          const i = M(n, e);
          r.slice().forEach((n) => {
            n.call(t, i);
          });
        }
      };
    })();
    let o,
      a,
      s = {};
    var l;
    return (
      (l = () => {
        const t = n;
        (s = {}),
          ds.forEach((n) => {
            n in t && (s[n] = t[n]);
          }),
          (o = s.container || n.container || document.body),
          a &&
            (N(), I).then(() => {
              a.setState({ ...s, container: o, parentElement: o });
            });
      }),
      G().$$.before_update.push(l),
      B(() => {
        (a = new ms(o || document.body, s)),
          gs.forEach((t) => {
            const e = jt(`on ${t}`);
            a.on(t, (r) => {
              const o = n[e] && n[e](r),
                a = i(t, r);
              return Rt(o) ? (Rt(a) ? void 0 : a) : o;
            });
          });
      }),
      (function (t) {
        G().$$.on_destroy.push(t);
      })(() => {
        a.destroy();
      }),
      (t.$set = (t) => {
        r(5, (n = e(e({}, n), u(t))));
      }),
      (n = u(n)),
      [
        function () {
          return a;
        },
      ]
    );
  }
  class xs extends st {
    constructor(t) {
      super(), at(this, t, bs, null, s, { getInstance: 0 });
    }
    get getInstance() {
      return this.$$.ctx[0];
    }
  }
  var ys = (() => {
    const t = xs.prototype;
    return (
      hs.forEach((n) => {
        t[n] = function (...t) {
          const e = this.getInstance(),
            r = e[n](...t);
          return r === e ? this : r;
        };
      }),
      xs
    );
  })();
  function Es(t) {
    let n, e, r, i, a, s, u, l, c, f, p, d, y, M, C, D, R, O, P, z;
    return (
      (R = new ys({
        props: {
          target: t[1],
          className: "moveable",
          draggable: !0,
          throttleDrag: 0,
          zoom: 1,
          origin: !0,
        },
      })),
      R.$on("dragStart", t[10]),
      R.$on("drag", t[11]),
      R.$on("render", t[12]),
      {
        c() {
          (n = m("div")),
            (e = m("div")),
            (r = m("img")),
            (a = x()),
            (s = m("h5")),
            (s.textContent = "Aiki"),
            (u = x()),
            (l = m("div")),
            (l.innerHTML =
              '<div class="aiki-leftright svelte-fugj2p" style="margin-top: 8px !important;\n      height: 4px !important;\n      width: 16px !important;\n      position: absolute !important;\n      background-color: grey !important;\n      border-radius: 2px !important;\n      transform: rotate(45deg) !important;\n      transition: all 0.3s ease-in !important;"></div> \n      <div class="aiki-rightleft svelte-fugj2p" style="margin-top: 8px !important;\n      height: 4px !important;\n      width: 16px !important;\n      position: absolute !important;\n      background-color: grey !important;\n      border-radius: 2px !important;\n      transform: rotate(-45deg) !important;\n      transition: all 0.3s ease-in !important;"></div>'),
            (c = x()),
            (f = m("button")),
            (p = b("Continue")),
            (d = m("br")),
            (y = b("Procrastinating")),
            (D = x()),
            rt(R.$$.fragment),
            S(r, "class", "aiki-img"),
            r.src !== (i = browser.runtime.getURL("images/AikiLogo.png")) &&
              S(r, "src", browser.runtime.getURL("images/AikiLogo.png")),
            S(r, "alt", "Aiki Logo"),
            w(r, "margin-left", "3px", 1),
            w(r, "width", "16px", 1),
            w(r, "height", "16px", 1),
            w(r, "background-color", "#282c34", 1),
            w(r, "border-radius", "5px", 1),
            w(r, "border", "2px solid #282c34", 1),
            S(s, "class", "aiki-h5"),
            w(s, "color", "#ffffff", 1),
            w(s, "font-weight", "500", 1),
            w(s, "font-size", "16px", 1),
            w(s, "font-family", "'Roboto', sans-serif", 1),
            w(s, "margin", "0 auto", 1),
            w(s, "cursor", "move", 1),
            S(l, "class", "aiki-close-container svelte-fugj2p"),
            w(l, "width", "20px", 1),
            w(l, "height", "20px", 1),
            w(l, "position", "relative", 1),
            w(l, "cursor", "pointer", 1),
            w(l, "z-index", "9999", 1),
            w(l, "margin-right", "3px", 1),
            S(e, "class", "aiki-header"),
            w(e, "height", "25px"),
            w(e, "display", "flex", 1),
            w(e, "width", "100%", 1),
            w(e, "justify-content", "space-between", 1),
            w(e, "align-items", "center", 1),
            S(f, "class", "aiki-button svelte-fugj2p"),
            (f.disabled = M = !t[3]),
            w(f, "white-space", "normal", 1),
            w(f, "max-width", "90%", 1),
            w(f, "margin", "5px 0px 0px 0px", 1),
            w(f, "display", "flex", 1),
            w(f, "flex-direction", "column", 1),
            w(f, "justify-content", "center", 1),
            w(f, "align-items", "center", 1),
            w(f, "z-index", "9001", 1),
            w(f, "background-color", "#28a745", 1),
            w(f, "border-color", "#28a745", 1),
            w(f, "border", "1px solid transparent", 1),
            w(f, "font-weight", "400", 1),
            w(f, "color", "#ffffff", 1),
            w(f, "text-align", "center", 1),
            w(f, "white-space", "nowrap", 1),
            w(f, "vertical-align", "middle", 1),
            w(f, "-ms-touch-action", "manipulation", 1),
            w(f, "touch-action", "manipulation", 1),
            w(f, "cursor", "pointer", 1),
            w(f, "background-image", "none", 1),
            w(f, "padding", "6px 12px", 1),
            w(f, "font-family", "'Lato', sans-serif", 1),
            w(f, "font-size", "14px", 1),
            w(f, "line-height", "1.42857143", 1),
            w(f, "border-radius", "4px", 1),
            w(f, "-webkit-user-select", "none", 1),
            w(f, "-moz-user-select", "none", 1),
            w(f, "-ms-user-select", "none", 1),
            w(f, "user-select", "none", 1),
            S(n, "class", "aiki-overlay"),
            w(n, "border-radius", "10px", 1),
            w(n, "flex-direction", "column", 1),
            w(n, "top", "1em", 1),
            w(n, "right", "1em", 1),
            w(n, "height", "95px", 1),
            w(n, "width", "120px", 1),
            w(n, "background-color", "#282c34", 1),
            w(n, "position", "fixed", 1),
            w(n, "z-index", "9001", 1),
            w(n, "display", "flex", 1),
            w(n, "align-items", "center", 1),
            w(n, "padding-top", "3px", 1),
            w(n, "box-shadow", "2px 2px 2px rgba(0, 0, 0, 0.3)", 1),
            w(n, "border", "1px solid #6c757d", 1);
        },
        m(i, o) {
          g(i, n, o),
            h(n, e),
            h(e, r),
            h(e, a),
            h(e, s),
            h(e, u),
            h(e, l),
            h(n, c),
            h(n, f),
            h(f, p),
            h(f, d),
            h(f, y),
            t[9](n),
            g(i, D, o),
            it(R, i, o),
            (O = !0),
            P || ((z = [E(l, "click", t[4]), E(f, "click", t[8])]), (P = !0));
        },
        p(t, [n]) {
          (!O || (8 & n && M !== (M = !t[3]))) && (f.disabled = M);
          const e = {};
          2 & n && (e.target = t[1]), R.$set(e);
        },
        i(t) {
          O ||
            (F(() => {
              C || (C = nt(n, ut, { delay: 0, duration: 200 }, !0)), C.run(1);
            }),
            J(R.$$.fragment, t),
            (O = !0));
        },
        o(t) {
          C || (C = nt(n, ut, { delay: 0, duration: 200 }, !1)),
            C.run(0),
            Q(R.$$.fragment, t),
            (O = !1);
        },
        d(e) {
          e && v(n),
            t[9](null),
            e && C && C.end(),
            e && v(D),
            ot(R, e),
            (P = !1),
            o(z);
        },
      }
    );
  }
  function Ss(t, n, e) {
    let r,
      i = { translate: [0, 0], rotate: 0, transformOrigin: "50% 50%" },
      { gotoOrigin: o } = n,
      { continueVisible: a } = n,
      { getReady: s } = n,
      { endInjection: u } = n,
      l = s();
    setInterval(() => e(3, (l = s())), 1e3),
      B(() => {
        document.querySelector(".moveable-control-box").style.visibility =
          "hidden";
      });
    return (
      (t.$$set = (t) => {
        "gotoOrigin" in t && e(0, (o = t.gotoOrigin)),
          "continueVisible" in t && e(5, (a = t.continueVisible)),
          "getReady" in t && e(6, (s = t.getReady)),
          "endInjection" in t && e(7, (u = t.endInjection));
      }),
      [
        o,
        r,
        i,
        l,
        function () {
          e(5, (a = !1)), u();
        },
        a,
        s,
        u,
        () => o("injected"),
        function (t) {
          _[t ? "unshift" : "push"](() => {
            (r = t), e(1, r);
          });
        },
        ({ detail: t }) => {
          t.set(i.translate);
        },
        ({ detail: t }) => {
          e(2, (i.translate = t.beforeTranslate), i);
        },
        ({ detail: t }) => {
          const { translate: n, rotate: e, transformOrigin: r } = i;
          (t.target.style.transformOrigin = r),
            (t.target.style.transform = `translate(${n[0]}px, ${n[1]}px) rotate(${e}deg)`);
        },
      ]
    );
  }
  class ws extends st {
    constructor(t) {
      super(),
        at(this, t, Ss, Es, s, {
          gotoOrigin: 0,
          continueVisible: 5,
          getReady: 6,
          endInjection: 7,
        });
    }
  }
  function Ms(t) {
    let n, e, r;
    function i(n) {
      t[5](n);
    }
    let o = {};
    return (
      void 0 !== t[0] && (o.welcomeVisible = t[0]),
      (n = new pt({ props: o })),
      _.push(() => et(n, "welcomeVisible", i)),
      {
        c() {
          rt(n.$$.fragment);
        },
        m(t, e) {
          it(n, t, e), (r = !0);
        },
        p(t, r) {
          const i = {};
          !e &&
            1 & r &&
            ((e = !0), (i.welcomeVisible = t[0]), Y(() => (e = !1))),
            n.$set(i);
        },
        i(t) {
          r || (J(n.$$.fragment, t), (r = !0));
        },
        o(t) {
          Q(n.$$.fragment, t), (r = !1);
        },
        d(t) {
          ot(n, t);
        },
      }
    );
  }
  function Cs(t) {
    let n, e, r;
    function i(n) {
      t[6](n);
    }
    let o = { gotoOrigin: t[1], endInjection: t[2], getReady: t[3] };
    return (
      void 0 !== t[4] && (o.continueVisible = t[4]),
      (n = new ws({ props: o })),
      _.push(() => et(n, "continueVisible", i)),
      {
        c() {
          rt(n.$$.fragment);
        },
        m(t, e) {
          it(n, t, e), (r = !0);
        },
        p(t, r) {
          const i = {};
          2 & r && (i.gotoOrigin = t[1]),
            4 & r && (i.endInjection = t[2]),
            8 & r && (i.getReady = t[3]),
            !e &&
              16 & r &&
              ((e = !0), (i.continueVisible = t[4]), Y(() => (e = !1))),
            n.$set(i);
        },
        i(t) {
          r || (J(n.$$.fragment, t), (r = !0));
        },
        o(t) {
          Q(n.$$.fragment, t), (r = !1);
        },
        d(t) {
          ot(n, t);
        },
      }
    );
  }
  function Ds(t) {
    let n,
      e,
      r,
      i = t[0] && Ms(t),
      o = t[4] && Cs(t);
    return {
      c() {
        i && i.c(), (n = x()), o && o.c(), (e = y());
      },
      m(t, a) {
        i && i.m(t, a), g(t, n, a), o && o.m(t, a), g(t, e, a), (r = !0);
      },
      p(t, [r]) {
        t[0]
          ? i
            ? (i.p(t, r), 1 & r && J(i, 1))
            : ((i = Ms(t)), i.c(), J(i, 1), i.m(n.parentNode, n))
          : i &&
            (Z(),
            Q(i, 1, 1, () => {
              i = null;
            }),
            K()),
          t[4]
            ? o
              ? (o.p(t, r), 16 & r && J(o, 1))
              : ((o = Cs(t)), o.c(), J(o, 1), o.m(e.parentNode, e))
            : o &&
              (Z(),
              Q(o, 1, 1, () => {
                o = null;
              }),
              K());
      },
      i(t) {
        r || (J(i), J(o), (r = !0));
      },
      o(t) {
        Q(i), Q(o), (r = !1);
      },
      d(t) {
        i && i.d(t), t && v(n), o && o.d(t), t && v(e);
      },
    };
  }
  function Rs(t, n, e) {
    let { gotoOrigin: r } = n,
      { endInjection: i } = n,
      { welcomeVisible: o } = n,
      { getReady: a } = n,
      s = !0;
    return (
      (t.$$set = (t) => {
        "gotoOrigin" in t && e(1, (r = t.gotoOrigin)),
          "endInjection" in t && e(2, (i = t.endInjection)),
          "welcomeVisible" in t && e(0, (o = t.welcomeVisible)),
          "getReady" in t && e(3, (a = t.getReady));
      }),
      [
        o,
        r,
        i,
        a,
        s,
        function (t) {
          (o = t), e(0, o);
        },
        function (t) {
          (s = t), e(4, s);
        },
      ]
    );
  }
  return new (class extends st {
    constructor(t) {
      super(),
        at(this, t, Rs, Ds, s, {
          gotoOrigin: 1,
          endInjection: 2,
          welcomeVisible: 0,
          getReady: 3,
        });
    }
  })({
    target: document.body,
    props: {
      welcomeVisible: shouldShowWelcome,
      gotoOrigin: gotoOrigin,
      endInjection: endInjection,
      getReady: getReady,
    },
  });
} //# sourceMappingURL=bundle.js.map
