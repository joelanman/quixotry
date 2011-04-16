function bindTermsOfServiceDialog(dom_id, target_id) {
  var dialog = new twttr.dialog({
    content: $('#' + dom_id),
    heading: $('<strong>TWITTER API TERMS OF SERVICE</strong>'),
    closeButton: false,
    modal: false,
    id: 'tos-popup',
    width: 700
  });

  $('#' + target_id).click(function() {
    dialog.open();
    return false;
  });

  $('a[id="terms-decline"]').click(function() {
    alert("You cannot create an application without agreeing to the terms of service.");
    $('.twttr-dialog').hide();
  });

  $('a[id="terms-accept"]').click(function() {
    $('.twttr-dialog').hide();
    $("#app-form").submit();
  });
  return dialog;
};

function resetAuthorizedDomainsMessages() {
    $('div.errors').slideUp();
    $('div.notices').slideUp();
    $('div.ajax_error').slideUp();
}

function bindAuthorizedDomainsControls() {
  $clickHandler = function() {
    $anchor = $(this);
    url_params = $(this).attr('id').substr(7).split('_');

    $.ajax({
      type: 'POST',
      url: $(this).attr('href'),
      dataType: 'json',
      data: { _method: 'DELETE', id: url_params[0], domain_id: url_params[1] },
      beforeSend: resetAuthorizedDomainsMessages,
      success: function(json) {
        $('#' + $anchor.attr('id') + '_item').fadeOut();
      },
      error: function(err) {
        $('div.ajax_error').slideDown();
      }
    });
    return false;
  };

  $('a.delete').click($clickHandler);

  $submit = $('#add_domain input[type=submit]');

  $('#add_domain').ajaxForm({
    dataType: 'json',
    beforeSend: resetAuthorizedDomainsMessages,
    success: function(json) {
      if (json['errors']) {
        $('div.errors').html(json['errors']).slideDown();
      } else {
        $('#new_domains_after_me').after(json['new_item']);
        $('#new_domains_after_me + li').fadeIn()
        $('#new_domains_after_me + li a').click($clickHandler);
        $('#add_domain #host').val('');
        if (json['notices']) {
          $('div.notices').html(json['notices']).slideDown();
        }
      }
    },
    error: function(err) {
        $('div.ajax_error').slideDown();
    }
  });
};
