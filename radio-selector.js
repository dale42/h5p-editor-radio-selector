/**
 * RadioSelector widget module
 *
 * @param {H5P.jQuery} $
 */
H5PEditor.widgets.radioSelector = H5PEditor.RadioSelector = (function ($, EventDispatcher) {

  var idCounter = 0;

  /**
   * Creates an image coordinate selector.
   *
   * @class H5PEditor.RadioSelector
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   */
  function RadioSelector(parent, field, params, setValue) {
    var self = this;

    // Inheritance
    EventDispatcher.call(this);

    // Wrapper for widget
    var $container = $('<div class="h5p-radio-selector">');

    // Wrapper for radio buttons
    var $options = $('<div class="h5p-radio-selector-options">').appendTo($container);

    // Wrapper for content corresponding to radio buttons
    var $values = $('<div class="h5p-radio-selector-values">').appendTo($container);

    // Unique radio selector id
    var uniqueId = 'h5p-radio-selector-' + idCounter++;

    // Stored options
    var storedOptions = [];

    // Make parent handle readies
    self.passReadies = true;

    // Processed semantics object
    self.children = [];

    // Default selected option
    var currentOption = 0;

    // Default params
    params = params || {};

    // Set current option from params
    field.fields.forEach(function (semanticField, idx) {
      if (semanticField.name && params[semanticField.name]) {
        currentOption = idx;
      }
    });

    // Make sure params are updated when fields are changed
    setValue(field, params);

    /**
     * Add option at given index
     *
     * @param {number} i Index of radio option
     * @param {Object} option Stored option
     * @param {string} option.type Type (e.g. 'image', 'bgColor')
     * @param {string} option.value Value of type
     */
    var addOption = function (i, option) {
      storedOptions[i] = option;
      triggerOption(i);
    };

    /**
     * Remove given radio option
     *
     * @param [i] Index of radio option
     */
    var removeOption = function (i) {
      i = i || currentOption;
      storedOptions[i] = undefined;
      triggerOptionRemoval();
    };

    /**
     * Trigger type removal to parent
     */
    var triggerOptionRemoval = function () {
      self.trigger('backgroundRemoved');
    };

    /**
     * Trigger type added to parent
     *
     * @param i Index of option triggered
     */
    var triggerOption = function (i) {
      currentOption = i;
      self.trigger('backgroundAdded');
    };

    /**
     * Append the field to the wrapper.
     *
     * @param {jQuery} $wrapper
     */
    self.appendTo = function ($wrapper) {
      createRadioContent();
      createRadioButtons();
      handleSemanticsEvents();
      storeInitialOptions();
      $container.appendTo($wrapper)
    };

    /**
     * Create radio content and show selected
     */
    var createRadioContent = function () {
      H5PEditor.processSemanticsChunk(field.fields, params, $values, self);
      $values.children().eq(currentOption).addClass('show');
    };

    /**
     * Create radio buttons
     */
    var createRadioButtons = function () {
      $values.children().each(function (idx) {
        var show = '';
        var label = $(this).find('.h5peditor-label').eq(0).html();

        // Show current option
        if (idx === currentOption) {
          show = ' checked="checked"';
          $(this).addClass('show');
        }

        // Create radio button for content
        $('<label><input type="radio"' + show + ' name="' + uniqueId + '">' + label + '</label>')
          .change(function () {

            // Show radio option
            triggerOptionRemoval();
            triggerOption(idx);
            self.showContent(idx);
            currentOption = idx;
          }).appendTo($options);
      });
    };

    /**
     * Show content with given index
     * @param index Index of content
     */
    self.showContent = function (index) {
      $values.children().removeClass('show');
      $values.children().eq(index).addClass('show');
    };

    var storeInitialOptions = function () {
      self.children.forEach(function (child, idx) {

        // Has params, store option
        if (child.params) {
          var type = '';
          var value;
          if (child instanceof ns.File) {
            type = 'image';
            if (child.params && child.params.path) {
              value = H5P.getPath(child.params.path, H5PEditor.contentId);
            }
          }
          else if (child instanceof H5PEditor.ColorSelector && child.params.length) {
            type = 'bgColor';
            value = '#' + child.params;
          }

          // Store options if we found a value
          if (value) {
            storedOptions[idx] = {type: type, value: value};
          }
        }
      });
    };

    /**
     * Handle changes in semantics
     */
    var handleSemanticsEvents = function () {
      self.children.forEach(function (child, i) {
        handleImages(child, i);
        handleColors(child, i);
      });
    };

    /**
     * Try handling child as image
     *
     * @param child
     * @param i
     */
    var handleImages = function (child, i) {
      if (!(child instanceof ns.File) || !child.changes) {
        return;
      }

      // Add to changes callback
      child.changes.push(function (img) {
        var type = 'image';

        // Check for image path
        if (img && img.path) {

          // Add image
          var value = H5P.getPath(img.path, H5PEditor.contentId);
          addOption(i, {type: type, value: value});
        }
        else {

          // Remove image
          removeOption(i);
        }
      });
    };

    /**
     * Try handling as color selector
     *
     * @param child
     * @param i
     */
    var handleColors = function (child, i) {
      if (!(child instanceof H5PEditor.ColorSelector)) {
        return;
      }

      var type = 'bgColor';

      child.$colorPicker.on('move.spectrum', function (e, tinycolor) {
        // Add color
        if (tinycolor) {
          addOption(i, {type: type, value: tinycolor.toHexString()});
        }
        else {
          // Remove color
          removeOption(i);
        }

        // Update ColorSelector manually, since it does not auto update when flat
        child.setColor(child.$colorPicker.spectrum('get', tinycolor));

      });
    };

    this.resetCheckedOption = function () {
      var resetOption = self.children[currentOption];

      if (resetOption instanceof ns.File) {
        // TODO: Make core h5peditor-file export a reset function
        // Temp solution, click 'close' using jquery
        $values.children().eq(currentOption)
          .find('.file > a.remove').click();
      }
      else if (resetOption instanceof H5PEditor.ColorSelector) {
        resetOption.$colorPicker.spectrum('set', null);
        //child.setColor(child.$colorPicker.spectrum('get', tinycolor));
        removeOption();
      }
    };

    this.getStoredOption = function () {
      return storedOptions[currentOption];
    };

    this.getSelectedIndex = function () {
      return currentOption;
    };

    this.reflow = function () {
      var selected = self.children[currentOption];
      if (selected instanceof H5PEditor.ColorSelector) {
        selected.$colorPicker.spectrum('reflow');
      }
    };

    this.setSelectedIndex = function (index) {
      var $input = $options.children().eq(index).find('input');
      if (!$input.is(':checked')) {
        $input.attr('checked', true);
        $input.trigger('change');
      }
    };

    /**
     * Prune unused params.
     *
     * @returns {Boolean} Valid or not
     */
    this.validate = function () {
      // Prune unused params
      $options.find('input').each(function (idx) {
        if (!$(this).is(':checked')) {
          delete params[field.fields[idx].name];
        }
        else if (self.children[idx] instanceof H5PEditor.ColorSelector) {
          // Make sure ColorSelector is saved
          var colorPicker = self.children[idx];
          colorPicker.setColor(colorPicker.$colorPicker.spectrum('get'));
        }
      });

      return true;
    };
  }

  // Inheritance
  RadioSelector.prototype = Object.create(EventDispatcher.prototype);
  RadioSelector.prototype.constructor = RadioSelector;

  /**
   * Communicate that we are ready.
   *
   * @returns {boolean}
   */
  RadioSelector.prototype.ready = function () {
    return true; // Always ready
  };

  /**
   * Remove me. Invoked by core
   */
  RadioSelector.prototype.remove = function () {
  };

  return RadioSelector;
})(H5P.jQuery, H5P.EventDispatcher);
