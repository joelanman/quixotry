// dependencies: jquery
if(!RobustHaven) var RobustHaven={};
if(!RobustHaven.Text) RobustHaven.Text={};
if(!RobustHaven.Text.TableOfContent) RobustHaven.Text.TableOfContent={};

RobustHaven.Text.TableOfContent = function(listtype) {
    this.listType = listtype;
    this.current = 0;
    this.toc = new Array();

    this.table = function(num) {
        var str = '';
        if (num > this.current) {
            for (var i = num; i > this.current; i--) {
                str += '<' + this.listType + '>';
            }
            this.current = num;
        } else if (num < this.current) {
            for (var i = num; i < this.current; i++) {
                str += '</li></' + this.listType + '>';
            }
            if (num != 1) {
                str += '</li>';
            }
            this.current = num;
        } else {
            str += '</li>';
            this.current = num;
        }
        return str;
    }

    this.getHtml = function(headings) {
        for (var i = 0, len = headings.length; i < len; i++) {
            var text = $(headings[i]).text();
            var anchorName = text.replace(/[^a-zA-Z0-9]/ig, '');
            $(headings[i]).attr('id', anchorName);
            var html = '<li><a href="#' + anchorName + '" title="' + text + '" style="text-decoration:none;">' + text + '</a>';
            switch ($(headings[i]).attr('tagName').toLowerCase()) {
                case 'h1': this.toc[i] = this.table(1) + html; break;
                case 'h2': this.toc[i] = this.table(2) + html; break;
                case 'h3': this.toc[i] = this.table(3) + html; break;
                case 'h4': this.toc[i] = this.table(4) + html; break;
                case 'h5': this.toc[i] = this.table(5) + html; break;
                case 'h6': this.toc[i] = this.table(6) + html; break;
                case 'h7': this.toc[i] = this.table(7) + html; break;
                case 'h8': this.toc[i] = this.table(8) + html; break;
                case 'h9': this.toc[i] = this.table(9) + html; break;
                default: break;
            }
        }

        var html = '';
        if (this.toc.length > 0) {
            for (var i = 0, len = this.toc.length; i < len; i++) {
                html += this.toc[i];
            }
            html += this.table(1);
        }

        return html;
    }
}


jQuery.fn.TableOfContentsBehavior = function(contentexpression, listtype) {
    if(listtype != "ul" && listtype != "ol")
        listtype == "ul";

    var headingElements = $('*', contentexpression)
        .filter(function(index) {
            var isHeadingExpression = /^h\d$/i;
            return isHeadingExpression.test(this.tagName);
        });

    var filter = new RobustHaven.Text.TableOfContent(listtype);
    var text = filter.getHtml(headingElements);
    $(this).attr('innerHTML', text);
}
