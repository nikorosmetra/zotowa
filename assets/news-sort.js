/*
 * Дата - единственный источник сортировки новостей. Порядок карточек в HTML не важен:
 * скрипт переставляет их сам. Главная - три последние новости (по убыванию даты).
 * Архив/аналитика - по возрастанию даты (старые сверху, новые снизу).
 */
(function () {
  function parseDate(text) {
    var parts = (text || '').trim().split('.');
    if (parts.length !== 3) return null;
    var d = parseInt(parts[0], 10), m = parseInt(parts[1], 10), y = parseInt(parts[2], 10);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d).getTime();
  }

  function sortContainer(container, dateSelector, order, limit) {
    if (!container) return;
    var items = Array.prototype.slice.call(container.children);
    var dated = items
      .map(function (el) {
        var dateEl = el.querySelector(dateSelector);
        return { el: el, time: dateEl ? parseDate(dateEl.textContent) : null };
      })
      .filter(function (x) { return x.time !== null; });
    if (!dated.length) return;

    dated.sort(function (a, b) { return order === 'asc' ? a.time - b.time : b.time - a.time; });

    dated.forEach(function (x) { container.appendChild(x.el); });
    if (limit) {
      dated.forEach(function (x, i) { x.el.style.display = i < limit ? '' : 'none'; });
    }
  }

  sortContainer(document.querySelector('.news-grid'), '.date', 'desc', 3);
  sortContainer(document.querySelector('.news-list'), '.news-date', 'asc', null);
})();
