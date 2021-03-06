angular.module('iGovMarkers')
  .service('FieldMotionService', ['iGovMarkers', FieldMotionService]);

function FieldMotionService(MarkersFactory) {
  this.FieldMentioned = {
    'in': function(fieldId, prefix) {
      return grepByPrefix(prefix).some(function(entry) {
        return _.contains(entry.aField_ID, fieldId);
      });
    },
    inShow: function(fieldId) {
      return this.in(fieldId, 'ShowFieldsOn');
    },
    inRequired: function(fieldId) {
      return this.in(fieldId, 'RequiredFieldsOn');
    },
    inWritable: function(fieldId) {
      return this.in(fieldId , "WritableFieldsOnCondition_");
    }
  };

  this.getCalcFieldsIds = function() {
    return grepByPrefix('ValuesFieldsOnCondition')
      .map(function(e) { return e.aField_ID; })
      .reduce(function(prev, curr) { return prev.concat(curr); }, []);
  };

  this.isFieldWritable = function(fieldId, formData) {
    return grepByPrefix('WritableFieldsOnCondition_').some(function(entry) {
      return evalCondition(entry, fieldId, formData);
    });
  };

  this.isFieldVisible = function(fieldId, formData) {
    var showOnNotEmpty = grepByPrefix('ShowFieldsOnNotEmpty_');
    var showOnCondition = grepByPrefix('ShowFieldsOnCondition_');
    var b1 = showOnNotEmpty.some(function(e) {
      return formData[e.sField_ID_s]
        && $.trim(formData[e.sField_ID_s].value)
        && _.contains(e.aField_ID, fieldId);
    });
    return b1 || showOnCondition.some(function(entry) {
      return evalCondition(entry, fieldId, formData);
    });
  };

  this.isFieldRequired = function(fieldId, formData) {
    var b = grepByPrefix('RequiredFieldsOnCondition_').some(function(entry) {
      return evalCondition(entry, fieldId, formData);
    });
    return b;
  };
  var fieldId_entryTriggered = {};
  this.calcFieldValue = function(fieldId, formData) {
    var entry = _.find(grepByPrefix('ValuesFieldsOnCondition'), function(entry) {
      return evalCondition(entry, fieldId, formData)
    });
    var result = {value: '', differentTriggered: false};
    if (entry) {
      result.differentTriggered = fieldId_entryTriggered[fieldId] ? (fieldId_entryTriggered[fieldId] != entry) : true;
      result.value = entry.sValue ? entry.sValue : entry.asID_Field_sValue[$.inArray(fieldId, entry.aField_ID)];
    }
    fieldId_entryTriggered[fieldId] = entry;
    return result;
  };

  this.getElementIds = function() {
    return grepByPrefix('ShowElementsOnTrue_')
      .map(function(e) { return e.aElement_ID; })
      .reduce(function(p, c) { return p.concat(c); },  []);
  };

  this.isElementVisible = function(elementId, formData) {
    var mentioned = {val:false};
    var bval = grepByPrefix('ShowElementsOnTrue_').some(function(entry) {
      return evalCondition(entry, elementId, formData, mentioned);
    });
    return mentioned.val ? bval : true;
  };

  this.getSplittingRules = function() {
    return grepByPrefix('SplitTextHalf_').reduce(function(p, c) {
        p[c.sID_Field] = {splitter: c.sSpliter, el_id1: c.sID_Element_sValue1, el_id2: c.sID_Element_sValue2};
        return p;
      }, {});
  };

  // this.getReplacingRules = function() {
  //   return grepByPrefix(/*'ReplaceTextLastSymbols_'*/'ReplaceTextSymbols_').reduce(function(p, c) {
  //       p[c.sID_Field] = c;
  //       return p;
  //     }, {});
  // };

  this.getReplacingRules = function () {
    return grepByPrefix('ReplaceTextSymbols_').reduce(function(p, c) {
     p[c.sID_Field] = {symbols: c.nSymbols, valueNew: c.sValueNew, el_id1: c.sID_Field, el_id2: c.sID_Element_sValue};
      return p;
    }, {});
  };

  function evalCondition(entry, fieldId, formData, mentioned) {
    if (!_.contains(entry.aField_ID || entry.aElement_ID, fieldId)) {
      return false;
    } else if(mentioned) {
      mentioned.val = true;
    }
    var toEval = entry.sCondition.replace(/\[(\w+)]/g, function(str, alias) {
      var fId = entry.asID_Field[alias];
      if (!fId) console.log('Cant resolve original fieldId by alias:' + alias);
      var result = '';
      if (formData[fId] && (typeof formData[fId].value === 'string' || formData[fId].value instanceof String)) {
        result = formData[fId].value.replace(/'/g, "\\'");
      } else if (formData.hasOwnProperty(fId)) {
        result = formData[fId].value;
      } else {
        console.log('can\'t find field [',fId,'] in ' + JSON.stringify(formData));
      }
      switch(alias.charAt(0)) {
        case 'b': result = result.toString();
        case 's': result = "'" + result + "'"; break;
        case 'n': result = result ? parseFloat(result) : 0; break;
        default: console.log('invalid alias format, alias:' + alias);
      }
      return result;
    });
    try {
      return eval(toEval);
    } catch (e) {
      console.log('OnCondition expression error\n' + e.name + '\n' + e.message
        + '\nexpression:' + entry.sCondition
        + '\nresolved expression:' + toEval);
      throw e;
    }
  }

  function grepByPrefix(prefix) {
    return MarkersFactory.grepByPrefix('motion', prefix);
  }
}
