/**
 * Поле 'markers' має посиланнями на поля, що потребують валідації по певному формату.
 * Важливо: різні маркери можуть призначатися одним і тим же полям. 
 * Див. i/issues/375, 654
 *
 * Валідатори:
 *
 * 1) 'TextUA' - Усі українскі літери, без цифр, можливий мінус (дефіс) та пробіл
 * Текст помилки: 'Текст може містити тількі українські літери або мінус чи пробіл'
 *
 * 2) 'TextRU' - Усі російські літери, без цифр, можливий мінус (дефіс) та пробіл
 * Текст помилки: 'Текст може містити тількі російські літери або мінус чи пробіл'
 *
 * 3) 'DateFormat' - Дата у заданому форматі DATE_FORMAT
 * Текст помилки: 'Дата може бути тільки формату DATE_FORMAT'
 *
 * 4) 'DateElapsed' - З/до дати у полі з/після поточної, більше/менше днів/місяців/років
 * Текст помилки: 'З/до дати з/після сьогоднішньої, має бути більше/менше ніж х-днів, х-місяців, х-років.
 *
 * х-___        - підставляти тільки, якщо x не дорівнює 0
 * З/До         - в залежності від bFuture
 * більше/менше - в залежності від bLess
 *
 * Приклад об'єкту markers:
 *
 * var markers = {
 *  'validate': {
 *    'PhoneUA': {
 *      'aField_ID': ['privatePhone','workPhone']
 *    }, 'Mail': {
 *      'aField_ID': ['privateMail', 'someMail']
 *    }, 'TextUA': { 
 *      'aField_ID': ['fio']
 *    }, 'TextRU': {
 *      'aField_ID': ['fio_RU']
 *    }, 'DateFormat': {
 *      'aField_ID': ['fio'],
 *      'sFormat': 'YYYY-MM-DD' //
 *    }, 'DateElapsed': {
 *      'aField_ID': ['dateOrder'],
 *      'bFuture': false, // якщо true, то дата modelValue має бути у майбутньому
 *      'bLess': true,    // якщо true, то 'дельта' між modelValue та зараз має бути 'менше ніж' вказана нижніми параметрами
 *      'nDays': 3,
 *      'nMonths': 0,
 *      'nYears': 1
 *    }
 *  }
 * };
 *
 * Де 'privatePhone' і 'workPhone' - це назви полів, яку треба валідувати.
 */

'use strict';

angular.module('app').service('ValidationService', ['moment', 'amMoment', 'angularMomentConfig', ValidationService])
  .constant('angularMomentConfig', {
    preprocess: 'utc',
    timezone: 'Europe/Kiev',
    format: 'HH:mm:ss, YYYY-MM-DD',
  });

// angularMomentConfig
function ValidationService(moment, amMoment, angularMomentConfig) {

  // Це для того, щоб бачити дати в українському форматі
  // FIXME: hardcoded locale value
  (moment.locale || moment.lang)('uk');
  amMoment.changeLocale('uk');

  var self = this;

  self.sFormat = 'YYYY-MM-DD';

  self.validateByMarkers = function(form, $scope) {

    var markers = $scope.markers;

    if (!markers || !markers.validate || markers.validate.length < 1) {
      return;
    }

    angular.forEach(markers.validate, function(validator, validatorName) {
      var fieldByName = self.validatorByName[validatorName];
      var marked = markers.validate[validatorName];

      function fieldByFieldId(field) {
        return field && field.$name && _.indexOf(marked['aField_ID'], field.$name) !== -1;
      }
      angular.forEach(form, function(formField) {
        if (fieldByFieldId(formField)) {
          var ffield = formField.$validators[fieldByName];
          // overwrite the default Angular field validator
          //
          //  ONLY ONCE
          //
          if (!ffield) {
            ffield = self.getValidatorByName(validatorName, formField);

            // switch ( validatorName ) {
            //   case 'DateFormat': 
            //     ffield.sFormat = marked['sFormat'];
            //     break;
            //   case 'DateElapsed':
            //     ffield.bFuture = marked['bFuture']; // 'bFuture': false, //если true то дата должна быть в будущем
            //     ffield.bLess = marked['bLess']; // : true, //если true то 'дельта' между датами должна быть 'менее чем' (указана нижними параметрами)
            //     ffield.nDays = marked['nDays'];  // 3,
            //     ffield.nMonths = marked['nMonths']; // : 0,
            //     ffield.nYears = marked['nYears']; //: 1
            //     break;
            // }

            // and validate it
            formField.$validate();
          }
        }
      });
    });
  };

  self.validatorByName = {
    'Mail': 'email',
    'AutoVIN': 'autovin',
    'PhoneUA': 'tel',
    'TextUA': 'textua',
    'TextRU': 'textru',
    'DateFormat': 'dateformat',
    'DateElapsed': 'dateelapsed'
  };

  /**
   * formField - додатковий параметр.
   * Повертає null для неіснуючого валідатора.
   */
  self.getValidatorByName = function(validatorName) {

    // console.log( 'validationService.getValidatorByName: ', validatorName, ' = ', fValidator );
    var fValidator = self.validatorFunctionsByFieldId[validatorName];

    // FIXME options .format, o.a, o.b, o.c, o.d, o.e, o.f
    var fValidatorModule = function(modelValue, options) {
      var result = null;
      if (fValidator) {
        result = fValidator.call(self, modelValue, options);
      }
      return result;
    };

    return fValidatorModule;
  };

  self.validatorFunctionsByFieldId = {
    'Mail': function(modelValue) {
      var bValid = true;
      var EMAIL_REGEXP = /^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
      bValid = bValid && EMAIL_REGEXP.test(modelValue);
      // console.log('Validate Email: ' + modelValue + ' is valid email: ' + bValid );
      return bValid;
    },

    /**
     * 'AutoVIN' - Логика: набор из 17 символов.
     * Разрешено использовать все арабские цифры и латинские буквы (А В C D F Е G Н J К L N М Р R S Т V W U X Y Z),
     * За исключением букв Q, O, I. (Эти буквы запрещены для использования, поскольку O и Q похожи между собой, а I и O можно спутать с 0 и 1.)
     */
    'AutoVIN': function(sValue) {

      var bValid = true;
      bValid = bValid && (sValue !== null);
      bValid = bValid && (sValue.length === 17);
      bValid = bValid && (/^[a-zA-Z0-9]+$/.test(sValue));
      bValid = bValid && (sValue.indexOf('q') < 0 && sValue.indexOf('o') < 0 && sValue.indexOf('i') < 0);
      bValid = bValid && (sValue.indexOf('Q') < 0 && sValue.indexOf('O') < 0 && sValue.indexOf('I') < 0);
      // console.log('Validate AutoVIN: ', sValue, ' is valid: ' + bValid );
      return bValid;
    },

    'PhoneUA': null,

    /**
     * 'TextUA' - Усі українскі літери, без цифр, можливий мінус (дефіс) та пробіл
     * Текст помилки: 'Текст може містити тількі українські літери або мінус чи пробіл'
     */
    'TextUA': function(modelValue) {
      var TEXTUA_REGEXP = /[ААБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя]|-|\s+/g;
      var TEXTRU_ONLY = /[ЁёЪъЫыЭэ]+/g;
      var bValid = TEXTUA_REGEXP.test(modelValue) && !TEXTRU_ONLY.test(modelValue);
      //console.log('Validate TextUA: ' + modelValue + ' is valid: ' + bValid );
      return bValid;
    },

    /**
     * 'TextRU' - Усі російські літери, без цифр, можливий мінус (дефіс) та пробіл
     * Текст помилки: 'Текст може містити тількі російські літери або мінус че пробіл'
     */
    'TextRU': function(modelValue) {
      var TEXTRU_REGEXP = /[АаБбВвГгДдЕеЁёЖжЗзИиЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЪъЫыЬьЭэЮюЯя]|-|\s+/g;
      var TEXTUA_ONLY = /[ҐЄІЇґєії]+/g;
      var bValid = TEXTRU_REGEXP.test(modelValue) && !TEXTUA_ONLY.test(modelValue);
      // console.log('Validate TextRU: ' + modelValue + ' is valid: ' + bValid );
      return bValid;
    },

    /**
     * 'DateFormat' - Дата у заданому форматі DATE_FORMAT
     * Текст помилки: 'Дата може бути тільки формату DATE_FORMAT'
     * Для валідації формату використовується  moment.js
     */
    'DateFormat': function(modelValue, options) {
      if (!options.sFormat) {
        return false;
      }

      var bValid = moment(modelValue, options.sFormat).isValid();

      // console.log('Validate DateFomat: ' + modelValue + ' is valid Date: ' + bValid + ' in ' + sFormat, ' format' );

      return bValid;
    },

    /**
     * 'DateElapsed' - З/до дати у полі з/після поточної, більше/менше днів/місяців/років
     *
     *  Параметри:
     *  bFuture: false,  // якщо true, то дата modelValue має бути у майбутньому
     *  bLess: true,     // якщо true, то 'дельта' між modelValue та зараз має бути 'менше ніж' вказана нижніми параметрами
     *  nDays: 3,
     *  nMonths: 0,
     *  nYears: 1
     *       
     * Текст помилки: 'Від/до дати до/після сьогоднішньої має бути більше/менше ніж х-днів, х-місяців, х-років.
     * х-___        - підставляти тільки, якщо x не дорівнює 0
     * З/До         - в залежності від bFuture
     * більше/менше - в залежності від bLess
     */
    'DateElapsed': function(modelValue, options) {

      // bFuture, bLess, nDays, nMonths, nYears
      var o = options;
      var bValid = true;
      var errors = [];
      var now = moment();
      var fmt = self.sFormat;
      var modelMoment = moment(modelValue, fmt);

      // базовий парсинг опцій
      var nDays = o.nDays || 0;
      var nMonths = o.nMonths || 0;
      var nYears = o.nYears || 0;

      // Повертаємо помилку, якщо дата невалідна: 
      if (!modelMoment.isValid()) {
        return false;
      }

      // Визначаємо різницю між датами
      var deltaDays = modelMoment.diff(now, 'days');
      var deltaMonths = modelMoment.diff(now, 'months');
      var deltaYears = modelMoment.diff(now, 'years');

      // // Повертаємо false, якщо різниці між датами немає:
      // if (deltaDays === deltaMonths === deltaYears === 0) {
      //   return true;
      // }

      // myLog(('DateElapsed: ' + o), 3);
      myLog((o.sDebug ? o.sDebug : '') + ' - зараз: ' + now.format(fmt) + ', ви увели: ' + modelMoment.format(fmt) + ', різниця: ' + deltaDays, 2);

      // Перевірка, чи виконується bFuture (дата має бути у майбутньому):
      var errorSuffix;

      if (o.bFuture === true && deltaDays < 1) {
        addError('Дата має бути у майбутньому, а ця — ' + (deltaDays === 0 ? 'ні' : getRealDeltaStr(true)));
        bValid = false;
      } else if (o.bFuture === false && deltaDays >= 1) {
        addError('Дата має бути у минулому, а ця — ' + (deltaDays === 0 ? 'ні' : getRealDeltaStr()));
        bValid = false;
      }

      function finalize() {
        for (var errorName in errors) {
          myLog(errors[errorName], 1);
        }
      }

      // Якщо вже є помилка - повертаємо помилку, далі перевіряти немає сенсу:
      if (bValid === false) {
        finalize();
        // myLog('-------------break ---------------', 2);
        return bValid;
      }

      // Якщо інших опцій немає - повертаємо рез-т
      if (typeof o.bLess === 'undefined') {
        return bValid;
      }

      addError(getErrorMessage());

      finalize();

      return bValid;

      // Допоміжні функції:

      // Генеруємо повідомлення про помилку
      function getErrorMessage() {
        // VID_DO: Від/до
        var sVidDo = o.bFuture ? 'До' : 'Від';
        // DO_PISLYA: до/після
        var sDoPislya = o.bFuture ? 'після' : 'до';
        // BIL_MEN: більше/менше
        var sBilMen = o.bLess ? 'менше' : 'більше';

        var maxDelta = moment.duration({
          days: nDays,
          months: nMonths,
          years: nYears
        }).as('days');

        var message = '{VID_DO} дати у полі {DO_PISLYA} поточної має бути {BIL_MEN} ніж {N_DAYS}{N_MONTHES}{N_YEARS}'; // - max Delta = ' + maxDelta

        // delta занадто велика - а o.bLess каже, що має бути менша:
        // TODO test it more
        if (o.bLess === true && Math.abs(deltaDays) > maxDelta || o.bLess === false && Math.abs(deltaDays) < maxDelta) {
          bValid = false;
          message = '' + message
            .replace('{VID_DO}', sVidDo)
            .replace('{DO_PISLYA}', sDoPislya)
            .replace('{BIL_MEN}', sBilMen)
            .replace('{N_DAYS}', self.pluralize(nDays, 'days'))
            .replace('{N_MONTHES}', self.pluralize(nMonths, 'months'))
            .replace('{N_YEARS}', self.pluralize(nYears, 'years'));
        } else {
          message = null;
        }
        return message;
      }

      // Альтеративний формат відображення помилки:
      function getAlternativeErrorMessage() {
        return [
          'Дата має бути у ',
          '' + (o.bFuture ? 'майбутньому' : 'минулому'),
          ' та відрізнятися ',
          '' + (o.bLess ? 'менше' : 'більше'),
          ', ніж на ' + getDeltaStr(options)
        ].join('');
      }

      function addError(msg) {
        if (msg) {
          errors.push(msg);
        }
      }

      // Використовуємо Moment для отримання рядків типу "рік тому", "за два дні" etc.
      function getRealDeltaStr(getFrom) {
        return getFrom ? modelMoment.from(now) : modelMoment.to(now);
      }

      function getDeltaStr() {
        var d = self.pluralize(nDays, 'days');
        var m = self.pluralize(nMonths, 'months');
        var y = self.pluralize(nYears, 'years');
        return (d ? d : '') + (m ? ', ' + m : '') + (y ? ', ' + y : '');
      }

      // FIXME disable in release - it's dev only
      function myLog(sMessage, l) {
        // чим більший рівень, тим більше інфи у консолі
        var logLevel = 1;
        if (l <= logLevel) {
          console.log('\t\t' + sMessage);
        }
      }
    }
  };

  self.fromDateToDate = function(dateA, dateB, fmt) {
    var sFormat = fmt ? fmt : self.sFormat;
    return moment(dateA, sFormat).from(moment(dateB, sFormat));
  };

  /**
   * Перетворює числа nUnits та ключ key на слова такі як: 
   * - 1 день, 2 дні, 5 днів, 
   * - 1 місяць, 3 місяці, 10 місяців
   * - 1 рік, 4 роки, 5 років
   */
  self.pluralize = function(nUnits, key) {
    var types = {
      'days': {
        single: 'день',
        about: 'дні',
        multiple: 'днів'
      },
      'months': {
        single: 'місяць',
        about: 'місяці',
        multiple: 'місяців'
      },
      'years': {
        single: 'рік',
        about: 'роки',
        multiple: 'років'
      }
    };
    var form = nUnits === 0 ? '' : Math.abs(nUnits) === 1 ? types[key].single : Math.abs(nUnits) < 5 ? types[key].about : types[key].multiple;
    form = form === '' ? '' : Math.abs(nUnits) + ' ' + form;
    return form;
  };

  /**
   * What is it? Check here: http://planetcalc.ru/2464/
   */
  this.getLunaValue = function(id) {

    // TODO: Fix Alhoritm Luna
    // Number 2187501 must give CRC=3
    // Check: http://planetcalc.ru/2464/
    // var inputNumber = 3;

    var n = parseInt(id);

    //var n = parseInt(2187501);

    var nFactor = 1;
    var nCRC = 0;
    var nAddend;

    while (n !== 0) {
      nAddend = Math.round(nFactor * (n % 10));
      nFactor = (nFactor === 2) ? 1 : 2;
      nAddend = nAddend > 9 ? nAddend - 9 : nAddend;
      nCRC += nAddend;
      n = parseInt(n / 10);
    }

    nCRC = nCRC % 10;

    // alert(nCRC%10);
    // nCRC=Math.round(nCRC/10)
    // alert(nCRC%10);
    // alert(nCRC);

    return nCRC;

  };

}