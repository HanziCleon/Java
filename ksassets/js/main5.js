jQuery(document).ready(function ($) {

  //aside menu action
  $('.hamb-menu').on('click', function (e) {
    $(this).toggleClass('active');
    $('.wrapped').toggleClass('open');
    if ($(window).width() < 1300) {
      $('body, html').toggleClass('no-scroll');
    }
  });

  //search action
  $('.header .btn-search').on('click', function () {
    if (!$(this).hasClass('active')) {
      $(this).addClass('active');
      $('.header').addClass('search-active');
    } else {
      $(this).removeClass('active');
      $('.header').removeClass('search-active');
      $('.search').removeClass('results-show');
    }
  });


  $("#search_form input").keyup(function () {
    console.log($(this).val());
    if ($(this).val() != '') {
      $('.header .search').addClass('results-show');
    } else {
      $('.header .search').removeClass('results-show');
    }
  });

  $('body').on('click', '.filter .select-item', function () {
    $(this).closest('.filter').toggleClass('show');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest(".filter").length) {
      $('.filter').removeClass('show');
    }
    e.stopPropagation();
  });

  $('.filter-trailer .select-item').on('click', function (e) {
    $(this).closest('.filter-trailer').toggleClass('show');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest(".filter-trailer").length) {
      $('.filter-trailer').removeClass('show');
    }
    e.stopPropagation();
  });

  $('.filter-form .select-item').on('click', function (e) {
    $(this).closest('.filter-form').toggleClass('show');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest(".filter-form").length) {
      $('.filter-form').removeClass('show');
    }
    e.stopPropagation();
  });

  $('#tabs-nav .link-tab').click(function () {
    $('#tabs-nav .link-tab').removeClass('active');
    $(this).addClass('active');
    $('.tab-content').hide();

    var activeTab = $(this).attr('href');
    $("#" + activeTab).fadeIn();
    return false;
  });

  $('.js-alphabet').click(function () {
    $(this).closest('.block-alphabet').find('.item-letter').removeClass('active');
    $(this).addClass('active');
    return false;
  });

  $(".my-rating-4").starRating({
    totalStars: 5,
    starShape: 'rounded',
    starSize: 16,
    emptyColor: 'white',
    activeColor: 'crimson',
    useGradient: true
  });

  // $('.rate-model').raty({
  // 	click: function(score, evt) {
  // 		alert('ID: ' + this.id + "\nscore: " + score);
  // 	}
  // });


  if ($(window).width() > 992) {
    $('.profile-set .prev-prof').on('click', function (e) {
      $(this).closest('.profile-set').toggleClass('open');
    });
  }

  $(document).on('click', function (e) {
    if (!$(e.target).closest(".profile-set").length) {
      $('.profile-set').removeClass('open');
    }
    e.stopPropagation();
  });

  if ($(window).width() < 1300) {
    $(document).on('click', function (e) {
      if ((!$(e.target).closest(".sidebar").length) && (!$(e.target).closest(".hamb-menu").length)) {
        $('.wrapped').removeClass('open');
        $('.hamb-menu').removeClass('active');
        $('body, html').removeClass('no-scroll');
      }
      e.stopPropagation();
    });
  }
  $(document).on('click', function (e) {
    if ((!$(e.target).closest(".search").length) && (!$(e.target).closest(".btn-search").length)) {
      $('.header').removeClass('search-active');
      $('.btn-search').removeClass('active');
    }
    e.stopPropagation();
  });

  customSelect();
  initTabs();
  userMess();
  initSearch();
  searchModels();
});

function initSearch() {
  var options = {
    url: "/search_results.php",
    getValue: "text",
    placeholder: "Search",
    list: {
      maxNumberOfElements: 13,
      match: {
        enabled: true
      }
    },
    template: {
      type: "links",
      fields: {
        link: "website-link"
      }
    },
    categories: [
      {
        listLocation: "search",
        maxNumberOfElements: 3,
        header: "Search suggestions:"
      },
      {
        listLocation: "category",
        maxNumberOfElements: 3,
        header: "Categories:"
      },
      {
        listLocation: "model",
        maxNumberOfElements: 3,
        header: "Models:"
      },
      {
        listLocation: "cs",
        maxNumberOfElements: 3,
        header: "Sites:"
      }
    ],
    requestDelay: 50
  };

  $(".wrap-input input").easyAutocomplete(options);
}

function initTabs() {
  $('body').on('click', '.js-open', function () {
    var $block = $(this).attr('data-open');
    if ($(this).hasClass('active')) {
      $('[data-block~=' + $block + ']').hide(500);
      $(this).removeClass('active');
    } else {
      $('.js-open').removeClass('active');
      $(".form-box").hide(500);
      $('[data-block~=' + $block + ']').show(500);
      $(this).addClass('active');
    }
    return false;
  });
};

function userMess() {
  $('.js_user_form').on('submit', function () {
    var $this = $(this);
    var $action = $this.attr('data-action');
    var $textarea = $this.find('textarea');
    var $text = $textarea.val();
    var get_url = "?action=" + $action + "&function=get_block&block_id=member_profile_view_view_profile&format=json&mode=async&message=" + $text;
    $.ajax({
      url: get_url,
      dataType: "text",
      success: function (msg) {
        var found_word = 'field';
        if (msg.indexOf(found_word) != -1) {
          $this.find('.failure_text').show();
        } else {
          $this.find('.form-holder').hide();
          $this.find('.failure_text').hide();
          $this.find('.success_text').show();
        }
      }
    });
    return false;
  });
}

$(document).ajaxStop(function () {
  setTimeout(func, 1000);
  setTimeout(func, 2000);
  setTimeout(func, 3000);
});
function func() {
  sessionStorage.clear();
  customSelect();
}


function customSelect() {
  $('.custom_select').select2({
    placeholder: "Select...",
    minimumResultsForSearch: Infinity
  });
}

function searchModels() {
  $('body').on('click', '.model_search', function () {
    $(".model_search").keyup(function (e) {
      clearTimeout($.data(this, 'timer'));
      if (e.keyCode == 13) {
        search(true);
      } else
        $(this).data('timer', setTimeout(search, 500));
    });
  });

  function search(force) {
    var existingString = $(".model_search").val();
    console.log(existingString);

    if (existingString.length < 1) {
      $('body').find(".no_search").show();
      $('body').find('.search_holder').html(' ');
      return
    }
    if (!force && existingString.length < 3) return;
    $.ajax({
      url: '/index.php?mode=async&function=get_block&block_id=list_models_models_selector&global=true&model=' + existingString, success: function (data) {
        $('body').find(".no_search").hide();
        $('body').find('.search_holder').html(data); modelsSelector(data);
      }
    })
  }

}

function modelsSelector(html) {
  var $container = $('[data-name="model_ids"]');
  var name = $container.attr('data-name');
  var selectedText;
  var models_name = $container.find('.js-model_name');
  var $input = $('#edit_video_models');
  var selected = ($container.attr('data-selected') || '').split(',');
  var selectedIds = [];
  var selectedLabels = [];
  var filterValue = '';
  var $popupContent = $("body").find('.list-selector-popup');

  var $filterInput = $popupContent.find('[name="filter"]');
  for (var i = 0; i < selected.length; i++) {
    var id = selected[i].trim();
    if (id) {
      var $checkbox = $popupContent.find('input[type="checkbox"][value="' + id + '"],input[type="radio"][value="' + id + '"]');
      var $label = $popupContent.find('label[for="' + $checkbox.attr('id') + '"]');
      $checkbox.prop('checked', true);
      selectedIds.push(id);
      selectedLabels.push($label.html());
    }
  }

  $container.append($popupContent);
  $popupContent.find('input[type="checkbox"]').click(function () {
    var $checkbox = $(this);
    var i = 0;
    var $label = $popupContent.find('label[for="' + $checkbox.attr('id') + '"]');
    if ($label.html()) {
      var value = $checkbox.prop('value');
      if ($checkbox.prop('checked')) {
        selectedIds.push(value);
        selectedLabels.push($label.html());
        $container.append($('<input type="hidden" name="' + name + '[]" value="' + value + '"/>'))
        selectedText = models_name.val() + $label.html() + ',';
      } else {
        for (i = 0; i < selectedIds.length; i++) {
          if (selectedIds[i] == value) {
            selectedIds.splice(i, 1);
            selectedLabels.splice(i, 1);
            var name1 = $label.html() + ',';
            selectedText = models_name.val().replace(name1, "");
            break;
          }
        }
        $container.find('input[type="hidden"][value="' + value + '"]').remove();
      }
      models_name.prop('value', selectedText);
      $input.prop('value', selectedText);
      $input.change();
    }
  }).focus(function () {
    $filterInput.focus();
  });


  $(document).mouseup(function (e) {
    if (!$container.is(e.target) && $container.has(e.target).length === 0) {
      $popupContent.hide();
    }
  });
}