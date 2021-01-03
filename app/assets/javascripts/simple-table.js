/**
 * The SimpleTable scriptery
 *
 * Copyright (C) 2013 Nikolay Nemshilov
 */
(function($) {

  if (!$) { return console.log("No jQuery? No Problem!"); }

  var current_table = null;

  // Event Listeners
  // ==========================================================================
  $(document).on('click', '.simple-table .pagination a', function(e) {
    e.preventDefault();
    $.simple_table($(this).closest('.simple-table'), this.getAttribute('href'));
  });

  $(document).on('click', '.simple-table th[data-order]', function(e) {
    order_table(this);
  });

  $(document).on('click', '.simple-table table th.mark > input[type="checkbox"]', mark_an_item_as_checked);

  $(document).on('click', '.simple-table table td.mark > input[type="checkbox"]', function() {
    return store_checked_ids_in_data_attribute($(this).closest('.simple-table'));
  });

  /* Load async tables */
  $(document).ready(function() {
    update_table_urls_from_query_string();
    load_tables('.simple-table .async');
  });

  $(window).on('popstate', function(e) {
    update_table_urls_from_query_string();
    load_tables('.simple-table > table[data-push]');
  });

  // Event Handlers
  // ==========================================================================

  // Fetches data and populates table based on order link clicked
  function order_table(order_link) {
    var asc = $(order_link).hasClass('asc');
    var order = $(order_link).data('order') + (asc ? '_desc' : '');
    var table = $(order_link).closest('.simple-table');
    var params = {};

    $.store_simple_order(table, order);
    $.append_simple_filters(table, params);
    params.order = order;
    params.page = 1;
    $.simple_table(table, build_url(
      $(order_link).closest('table').data('url'), params
    ));
  }

  // Finds all simple-table with a url stored in the query string, and updates
  // their data-url attribute
  function update_table_urls_from_query_string() {
    url_object = get_query_params();
    for (var key in url_object) {
      table_match = key.match(/simple-table\[(.+)\]/)
      if (table_match !== null) {
        $("#" + table_match[1]).data('url', url_object[key])
      }
    }
  }

  function load_tables(finder) {
    $(finder).each(function(index, element) {
      var table = $(element);
      return $.simple_table(table.closest('.simple-table'), table.data('url'), true);
    });
  }

  function mark_an_item_as_checked(){
    $(this).closest('table').find('td.mark > input[type="checkbox"]').each((function(_this) {
      return function(i, box) {
        box.checked = _this.checked;
        return true;
      };
    })(this));
    return store_checked_ids_in_data_attribute($(this).closest('.simple-table'));
  }

  // Public Functions
  // ==========================================================================

  var simple_table = $.fn.simple_table = $.simple_table = function(container, url, no_push) {
    current_table = container.addClass('loading');
    actual_table  = container.find('table');
    var table_id = actual_table.attr('id');

    actual_table.trigger('simple-table:request');

    if (history.pushState && !no_push && actual_table.data('push')) {
      push_table_state(table_id, url);
    }

    $.ajax(url, {
      cache: false,
      success: function(new_content) {
        table_load_success(container, new_content, url)
        load_checkbox_state_for_page(container);
      },
      complete: function() {
        container.removeClass('loading');
        actual_table  = container.find('table');
        actual_table.trigger('simple-table:loaded');
      }
    });
  };

  var store_simple_filters = $.fn.store_simple_filters = $.store_simple_filters = function(table, filters) {
    table.data("simpleFilters", filters);
  };

  var store_simple_order = $.fn.store_simple_order = $.store_simple_order = function(table, order) {
    table.data("simpleOrder", order);
  };

  var append_simple_order = $.fn.append_simple_order = $.append_simple_order = function(table, params) {
    if(table.data('simpleOrder')) {
      params.order = table.data('simpleOrder')
    }
  }

  var append_simple_filters = $.fn.append_simple_filters = $.append_simple_filters = function(table, params) {
    var filters = table.data('simpleFilters');
    if(filters) {
      for (var attrname in filters) { params[attrname] = filters[attrname]; }
    }
  }

  // Helper Functions
  // ==========================================================================

  // Pushes the table's state/url to history
  function push_table_state(table_id, url) {
    url_object = get_query_params();
    url_object['simple-table[' + table_id + ']'] = url;

    combined_url = current_pathname + "?" + $.param(url_object);

    history.pushState({url: combined_url}, 'simple-table', combined_url);
    url = build_url(url, {simple_table_cache_killa: true});
  }

  // Callback for successful ajax load of table data
  function table_load_success(container, new_content, url) {
    var new_container = $(new_content);
    container.html($(new_content).children());

    var actual_table = new_container.find('table');
    actual_table.data('url', url);

    if (new_container.find('tbody').children().length > 0) {
      container.removeClass('empty');
    }
  }

  function store_checked_ids_in_data_attribute(container) {
    var checked_ids;
    checked_ids = (container.data('checked') || '').split(',');
    container.find('td.mark input[type="checkbox"]').each(function() {
      var item_id;
      item_id = $(this).data('item-id').toString();
      if ($.inArray(item_id, checked_ids) === -1) {
        if (this.checked) {
          return checked_ids.push(item_id);
        }
      } else if (!this.checked) {
        return checked_ids.splice($.inArray(item_id, checked_ids), 1);
      }
    });
    return container.data('checked', checked_ids.join(',').replace(/^,/, ''));
  };

  function load_checkbox_state_for_page(container) {
    var checked_ids;
    checked_ids = (container.data('checked') || '').split(',');
    return container.find('td.mark input[type="checkbox"]').each(function() {
      this.checked = $.inArray($(this).data('item-id').toString(), checked_ids) !== -1;
      return true;
    });
  };

  // URL Functions
  // ==========================================================================

  function get_query_params() {
    current_pathname = window.location.pathname;
    current_search = window.location.search;

    return parse_url(current_pathname + current_search)[1];
  }

  /**
   * Rebuilds the url with the extra prams
   */
  function build_url(url, params) {
    var path, args; path = parse_url(url);
    args = path[1]; path = path[0];

    for (var key in params) {
      args[key] = params[key];
    }

    return path + "?" + $.param(args);
  }

  /**
   * Parsing the arguments out of the url query
   */
  function parse_url(url) {
    var path, query, args={}, list, key, value;
    path = url.split("?"); query = path[1]; path = path[0];

    if (query) {
      for (var i=0, list = query.split('&'); i < list.length; i++) {
        key   = list[i].split('=');
        value = key[1]; key = key[0];

        key   = decodeURIComponent(key);
        value = decodeURIComponent((value||'').replace(/\+/g, ' '));

        if (key.substr(-2) === "[]") {
          if (args[key]) {
            args[key].push(value)
          } else {
            args[key] = [value]
          }
        } else {
          args[key] = value
        }
      }
    }

    return [path, args];
  }

})(jQuery);
