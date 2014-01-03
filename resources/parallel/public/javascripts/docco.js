'use strict';

var storage = !!window.sessionStorage
      ? JSON.parse(window.sessionStorage.getItem('docco-xt') || '{}')
      : false;

function getPref(term) {
  var max = 0, pref, dbl = false;
  if (!storage && storage[term]) return false;
  for (var k in storage[term]) {
    var v = storage[term][k];
    if (v > max) {
      max = v;
      pref = k;
      dbl = false;
    } else if (v === max) {
      dbl = true;
    }
  }
  return dbl ? false : pref;
}

function fuzzy(term, files, options) {
  var opts = options || {}, matches = [];
  var regex, isMatch, file, pref, ext = false;

  if (opts.ignorecase == null) opts.ignorecase = true;
  if (opts.ignoreextension == null) opts.ignoreextension = true;
  if (opts.ignoreextension) {
    ext = {};
    files = files.map(function(file, wo) {
      ext[wo = file.replace(/\.[^.]*$/, '')] = file;
      return wo;
    });
  }

  regex = getRegex(term, opts.ignorecase ? 'i' : '');
  pref = getPref(term);
  if (pref && opts.ignoreextension) pref = pref.replace(/\.[^.]*$/, '');
  if (pref) matches.unshift(ext ? ext[pref] : file);
  for (var i = 0; i < files.length; i++) {
    file = files[i];
    if (matches.length === opts.limit) break;
    if (file === pref) continue;
    if (file.indexOf(term) === 0) {
      matches.unshift(ext ? ext[file] : file);
      continue;
    }
    isMatch = regex.test(file);
    if (!isMatch) continue;
    matches.push(ext ? ext[file] : file);
  }
  return matches;
}

function getRegex(search, flags) {
  var chars = search.split(''), regex = [];
  for (var i = 0; i < chars.length; i++)
    regex.push('([' + (chars[i] == '\\' ? '\\\\' : chars[i]) + '])');
  return new RegExp('^.*?' + regex.join('[^/]*?') + '.*$', flags);
}

// retrieve a few dom elements
var element = document.getElementById('fileSearch');
var hiddenLinkBox = document.getElementById('jump_page_hidden');
var linkBox = document.getElementById('jump_page');

// listen for up- and down-arrow to change the selected file and enter to select it
element.addEventListener('keydown', function(event) {
  var next = event.which === 40;
  var prev = event.which === 38;
  var enter = event.which === 13;
  if (!prev && !next && !enter) return;
  event.stopPropagation();
  var selected = document.querySelector('#jump_page .selected');
  if (!selected) return;
  if (next && selected.nextSibling) {
    selected.className = selected.className.replace(/\bselected\b/, '');
    selected.nextSibling.className = selected.nextSibling.className + ' selected';
  } else if (prev && selected.previousSibling) {
    selected.className = selected.className.replace(/\s*\bselected\b/, '');
    selected.previousSibling.className += ' selected';
  } else if (enter) {
    var path = selected.getAttribute('data-name');
    if (storage) {
      if (!storage[element.value]) storage[element.value] = {};
      if (!storage[element.value][path]) storage[element.value][path] = 1;
      else storage[element.value][path]++;
      sessionStorage.setItem('docco-xt', JSON.stringify(storage));
    }
    window.location.href = selected.getAttribute('href');
  }
});

function showResults(results) {
  var links = [].slice.call(document.querySelectorAll('#jump_wrapper .source'));
  var filteredLinks = results.map(function(result) {
    return document.querySelector('#jump_wrapper .source[data-name="' + result + '"]')
  });
  links.forEach(function(link) {
    hiddenLinkBox.appendChild(link);
    link.className = link.className.replace(/\s*\bselected\b/, '');
  });
  if (filteredLinks.length) {
    filteredLinks[0].className = filteredLinks[0].className + ' selected';
    filteredLinks.forEach(function(link) {
      linkBox.appendChild(link);
    });
  }
}

// listen for input and filter the list of files
element.addEventListener('input', function(event) {
  var term = event.target.value;
  var results = fuzzy(term, window.files);
  showResults(results);
});

// focus/unfocus search box on escape
window.addEventListener('keydown', function(event) {
  if (event.which !== 27) return;
  if (element === document.activeElement) {
    element.value = '';
    element.blur();
    showResults([]);
  } else {
    element.focus();
  }
});