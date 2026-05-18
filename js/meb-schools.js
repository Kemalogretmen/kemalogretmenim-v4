(function() {
  'use strict';

  var RAW_BASE = 'https://raw.githubusercontent.com/MehmetHuseyinDelipalta/MEB-Okul-Veritabani/main/T%C3%BCm%20Okullar';
  var locationPromise = null;
  var schoolCache = {};

  function normalizePlace(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
  }

  function makeKey() {
    return Array.prototype.slice.call(arguments).map(normalizePlace).join('|');
  }

  function encodeSegment(value) {
    return encodeURIComponent(normalizePlace(value));
  }

  function districtUrl(city, district) {
    var cityName = normalizePlace(city);
    var districtName = normalizePlace(district);
    var fileName = cityName + ' - ' + districtName + ' - Tüm Okullar.json';
    return RAW_BASE + '/' + encodeSegment(cityName) + '/' + encodeSegment(districtName) + '/' + encodeURIComponent(fileName);
  }

  function cityUrl(city) {
    var cityName = normalizePlace(city);
    var fileName = cityName + ' - Tüm Okullar.json';
    return RAW_BASE + '/' + encodeSegment(cityName) + '/' + encodeURIComponent(fileName);
  }

  async function fetchJson(url) {
    var response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error('Okul listesi yüklenemedi.');
    }
    return response.json();
  }

  function schoolId(city, district, school) {
    var raw = school && (school.YOL || school.HOST || school.OKUL_ADI || school.name);
    return 'meb:' + makeKey(city, district, raw);
  }

  function toSchool(city, district, school) {
    var name = String(school && (school.OKUL_ADI || school.name || school.okul || school.school) || '').trim();
    if (!name) {
      return null;
    }
    return {
      id: schoolId(city, district, school),
      name: name,
      city: normalizePlace(city),
      district: normalizePlace(district),
      meb_code: school && school.YOL ? String(school.YOL) : '',
      host: school && school.HOST ? String(school.HOST) : '',
      website: school && school.WEBSITE ? String(school.WEBSITE) : '',
      type: '',
      external: true,
      source: 'meb',
    };
  }

  function dedupeSchools(list) {
    var seen = {};
    return (Array.isArray(list) ? list : []).filter(function(school) {
      var key = makeKey(school.name, school.district || '', school.meb_code || school.host || '');
      if (!school.name || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    }).sort(function(a, b) {
      return a.name.localeCompare(b.name, 'tr-TR');
    });
  }

  function flattenSchools(payload, city, district) {
    var cityKey = normalizePlace(city);
    var districtKey = normalizePlace(district);
    var firstPayloadKey = Object.keys(payload || {})[0];
    var cityNode = payload && (payload[cityKey] || payload[firstPayloadKey]);
    var schools = [];

    if (Array.isArray(cityNode)) {
      schools = cityNode.map(function(item) {
        return toSchool(cityKey, districtKey, item);
      });
      return dedupeSchools(schools.filter(Boolean));
    }

    Object.keys(cityNode || {}).forEach(function(rawDistrict) {
      var normalizedDistrict = normalizePlace(rawDistrict);
      if (districtKey && normalizedDistrict !== districtKey) {
        return;
      }
      var rows = cityNode[rawDistrict];
      if (!Array.isArray(rows)) {
        return;
      }
      rows.forEach(function(item) {
        var school = toSchool(cityKey, normalizedDistrict, item);
        if (school) {
          schools.push(school);
        }
      });
    });

    return dedupeSchools(schools);
  }

  async function loadLocations() {
    if (!locationPromise) {
      locationPromise = fetch('/data/turkey-cities.json', { cache: 'force-cache' })
        .then(function(response) {
          return response.ok ? response.json() : [];
        })
        .then(function(rows) {
          return Array.isArray(rows) ? rows.map(function(city) {
            return {
              name: normalizePlace(city.name),
              plate: city.plate || '',
              counties: Array.isArray(city.counties)
                ? city.counties.map(normalizePlace).sort(function(a, b) { return a.localeCompare(b, 'tr-TR'); })
                : [],
            };
          }).sort(function(a, b) {
            return a.name.localeCompare(b.name, 'tr-TR');
          }) : [];
        });
    }
    return locationPromise;
  }

  async function getDistricts(city) {
    var cityName = normalizePlace(city);
    var locations = await loadLocations();
    var match = locations.find(function(item) {
      return item.name === cityName;
    });
    return match ? match.counties.slice() : [];
  }

  async function loadSchools(options) {
    var settings = options || {};
    var city = normalizePlace(settings.city);
    var district = normalizePlace(settings.district);
    var allowCityFallback = Boolean(settings.allowCityFallback);
    var cacheKey = makeKey(city, district || (allowCityFallback ? 'ALL' : ''));

    if (!city || (!district && !allowCityFallback)) {
      return [];
    }
    if (!schoolCache[cacheKey]) {
      schoolCache[cacheKey] = fetchJson(district ? districtUrl(city, district) : cityUrl(city))
        .then(function(payload) {
          return flattenSchools(payload, city, district);
        })
        .catch(function() {
          return [];
        });
    }
    return schoolCache[cacheKey];
  }

  function optionLabel(school, includeDistrict) {
    if (!school) {
      return '';
    }
    return school.name + (includeDistrict && school.district ? ' - ' + school.district : '');
  }

  window.kemalMebSchools = {
    normalizePlace: normalizePlace,
    loadLocations: loadLocations,
    getDistricts: getDistricts,
    loadSchools: loadSchools,
    optionLabel: optionLabel,
    sourceUrl: 'https://github.com/MehmetHuseyinDelipalta/MEB-Okul-Veritabani',
  };
})();
