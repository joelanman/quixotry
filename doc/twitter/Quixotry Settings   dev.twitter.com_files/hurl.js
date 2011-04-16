var Hurl = {
  // apply label hints to inputs based on their
  // title attribute
  labelHints: function(el) {
    $(el).each(function() {
      var self = $(this), title = self.attr('title')

      // indicate inputs using defaults
      self.addClass('defaulted')

		  if (self.val() === '' || self.val() === title) {
			  self.val(title).css('color', '#E9EAEA')
		  } else {
				self.addClass('focused')
      }

		  self.focus(function() {
			  if (self.val() === title) {
				  self.val('').addClass('focused').css('color', '#333')
			  }
		  })

		  self.blur(function() {
			  if (self.val() === '') {
				  self.val(title).removeClass('focused').css('color', '#E9EAEA')
			  }
		  })
    })
  },

  removeEmptyData: function(data) {
    var keepers = [], value

    // remove empty arrays and any default titular data
    for (key in data) {
      if (value = data[key].value) {
        if ($('input[name=' + data[key].name +'].defaulted:not(.focused)').val() != value) {
          keepers.push(data[key])
        }
      }
    }

    data.splice(0, data.length)

    for (key in keepers)
      data.push( keepers[key] )

    return true
  }
}

$.fn.hurlAjaxSubmit = function(callback) {
  return $(this).ajaxSubmit({
    beforeSubmit: Hurl.removeEmptyData,
    success: callback
  })
}

$(document).ready(function() {
  // select method
  $('#select-method').change(function() {
    $('#select-method option:selected').each(function() {
      var method = $(this).attr('value')
      if (method == 'POST'){
        $('#post-params').show()
      } else {
        $('#post-params').hide()
      }
    })
  })
  $('#select-method').change()

  // add auth
  $('input[name=auth]').change(function() {
    if ($(this).attr('value') == 'basic') {
      $('#basic-auth-fields').show()
      $('#basic-auth-fields .form-alpha').focus()
    } else {
      $('#basic-auth-fields').hide()
    }
  })
  $('#auth-selection :checked').change()

  // add post param
  $('#add-param').click(function() {
    var newField = $('#param-fields').clone()
    newField.toggle().attr('id', '')
    newField.find('.form-alpha').attr('title', 'name')
    newField.find('.form-beta').attr('title', 'value')
    newField.find('.param-delete').css('visibility', 'visible')
    Hurl.labelHints( newField.find('input[title]') )
    registerRemoveHandlers( newField, '.param-delete' )
    $(this).parent().append( newField );
    $(this).appendTo($(this).parent());
    return false
  })

  // add header
  $('#add-header').click(function() {
    var newField = $('#header-fields').clone()
    newField.toggle().attr('id', '')
    Hurl.autocompleteHeaders( newField.find('.form-alpha') )
    newField.find('.form-alpha').attr('title', 'name')
    newField.find('.form-beta').attr('title', 'value')
    Hurl.labelHints( newField.find('input[title]') )
    registerRemoveHandlers( newField, '.header-delete' )
    $(this).parent().append( newField );
    $(this).appendTo($(this).parent());
    return false
  })

  // remove header / param
  function registerRemoveHandlers(el, klass) {
    $(el).find(klass).click(function() {
      $(this).parents('p:first').remove()
      return false
    })
  }

  registerRemoveHandlers( document, '.header-delete' )
  registerRemoveHandlers( document, '.param-delete' )

  // hurl it!
  $('#hurl-form').submit(function() {
    $('#send-wrap').children().toggle()
    $('.flash-error, .flash-notice').fadeOut()
    $('#request-and-response').hide()

    $(this).hurlAjaxSubmit(function(res) {
      var data = JSON.parse(res)

      if (data.error) {
        $('#flash-error-msg').html(data.error)
        $('.flash-error').show()
      } else if (/hurl/.test(location.pathname) && data.hurl_id && data.view_id) {
        window.location = '/hurls/' + data.hurl_id + '/' + data.view_id
      } else if (data.header && data.body && data.request) {
        if ( /railsrumble/.test($('input[name=url]').val()) ) Hurl.pony()
        if (data.prev_hurl) {
          $('#page-prev').attr('href', '/hurls/' + data.prev_hurl).show()
          $('#page-next').attr('href', '/').show()
        }
        $('.permalink').attr('href', '/hurls/'+data.hurl_id+'/'+data.view_id)
        $('.full-size-link').attr('href', '/views/' + data.view_id)
        $('#request').html(data.request)
        $('#response').html('<pre>' + data.header + '</pre>' + data.body)
        $('.help-blurb').hide()
        $('#request-and-response').show()
      } else {
        $('#flash-error-msg').html("Weird response. Sorry.")
        $('.flash-error').show()
      }

      $('#send-wrap').children().toggle()
    })

    return false
  })

  // delete hurl
  $('.hurl-delete').click(function() {
    $(this).parents('tr:first').remove()
    $.ajax({type: 'DELETE', url: $(this).attr('href')})
    return false
  })

  // toggle request/response display
  $('.toggle-reqres-link').click(function(){
    $('.toggle-reqres').toggle()
    $('#code-request').toggle()
    $('#code-response').toggle()
    return false
  })

  // flash close
  $('.flash-close').click(function (){
    $(this).parent().fadeOut()
    return false
  })

  // in-field labels
	Hurl.labelHints('input[title]')
})