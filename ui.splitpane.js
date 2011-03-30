/*
 *	Splitpane jQuery UI plugin
 *
 *	Creates a simple split panel with 2 resizable panels, reminiscent of
 *	the Java® Swing® split pane widget thing.
 *
 *	This file is part of ui.splitpane.js
 *
 *	Copyright 2008, 2011 Andrew Thompson
 *
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	(at your option) any later version.
 *
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU General Public License for more details.
 *
 *	You should have received a copy of the GNU General Public License
 *	along with this program. If not, see http://www.gnu.org/licenses/gpl.txt
 *
 *
 *	Synposis:
 *
 *		$("selector").splitpane({
 *			orientation: "horizontal",
 *			ratio: 0.5
 *			pane_class: "",
 *			grab_class: "",
 *			width: 0,
 *			height: 0
 *		});
 *
 *	Parameters:
 *
 *		* orientation - string - one of ["horizontal", "vertical"] - orientation of the split
 *		* ratio - float - the height or width ratio of first pane/second pane
 *		* pane_class - string - addtional HTML class to give to the panels of the split
 *		* grab_class - string - additional HTML clas to give the the grab handle
 *		* width - string - CSS width of the widget. This is the total width of the widget
 *		* height - string - CSS height of the widget. Again, total height of the widget.
 *		* min_height - int - minimum height in pixels of horizontal resizable pane.
 *		* min_width - int - minimum width in pixels of a vertical resizable pane.
 *
 */
(function($) {
	$.widget(
		"ui.splitpane",
		{
			options: {
				orientation: "horizontal",
				ratio: 0.5,
				pane_class: "",
				grab_class: "",
				min_width: 0,
				min_height: 0
			},

			_create: function() {
				this.options.orientation = ("vertical" == this.options.orientation)
					? "vertical"
					: "horizontal";
				if (this.options.width) this.element.css({"width": this.options.width});
				if (this.options.height) this.element.css({"height": this.options.height});
				this.element.html("");

				var one = this._append_node(
					"div", "majik_split_pane majik_split_pane_normal" + this.options.pane_class, this.element
				);
				this._dimension(one, (this._dimension(this.element) * this.options.ratio));
				var grab = this._append_node(
					"div", "majik_split_pane_grab majik_split_pane_normal" + this.options.grab_class, this.element
				);
				var a = this._append_node(
					"a", "majik_split_pane_grab majik_split_pane_normal" + this.options.grab_class, grab
				);
				this._dimension(one, this._dimension(one) - (this._dimension(grab)/2));
				var two = this._append_node(
					"div", "majik_split_pane majik_split_pane_normal" + this.options.pane_class, this.element
				);
				this._dimension(
					two, this._dimension(this.element) - (this._dimension(one) + this._dimension(grab))
				);

				// Force the parent to assume the height required by the new contents, accounting for
				// pebcak margins, borders, padding etc.
				// XXX: try use inner width/height instead of this bodge
				var css = {};
				css[this._property("dimension")] = "auto";
				this.element.css(css);

				// visual feedback drag events
				// XXX: known jquery/jqueryui bug - parent containment behaves like a overflow: hidden container,
				// and does not limit movement.
				$(grab).draggable({
					containment: "parent",
					axis: this._property("axis"),
					scroll: false
				}).bind(
					"dragstart",
					function() {
						var handle = $(this);
						handle.parent().find(".majik_split_pane")
							.addClass("majik_split_pane_resizing")
							.removeClass("majik_split_pane_normal")
							.css({"opacity": 0.75, "cursor": handle.css("cursor") + " !important"});
						handle
							.css({"opacity": 0.85, "z-index": 1000})
							.addClass("majik_split_pane_resizing")
							.removeClass("majik_split_pane_normal");
					}
				).bind(
					"dragstop",
					function() {
						var handle = $(this);
						handle.parent().find(".majik_split_pane")
							.removeClass("majik_split_pane_resizing")
							.addClass("majik_split_pane_normal")
							.css({"cursor": "", "opacity": 1});
						handle
							.css({"opacity": 1, "z-index": 1})
							.removeClass("majik_split_pane_resizing")
							.addClass("majik_split_pane_normal");
					}
				);
				// ...and the heavy lifting, resize/move event
				var split_pane = this;
				$(grab).bind(
					"dragstop",
					function(evt, pos) {
						var delta_one = split_pane._dimension(two) - pos.position[split_pane._property("position")];
						var delta_two = split_pane._dimension(one) + pos.position[split_pane._property("position")];
						var total  = split_pane._dimension(two) + split_pane._dimension(one);
						split_pane._dimension(one, split_pane._balance(delta_two, delta_one, total));
						split_pane._dimension(two, split_pane._balance(delta_one, delta_two, total));
						var css = {};
						css[split_pane._property("position")] = "0px";
						$(this).css(css);
					}
				);
				// Lastly, if this was a subsplit, then remove the class from the parent.
				// Only innermost splitpanes are to be styled, else we'll end up with ugly
				// concentric borders around all nested panes.
				if(this.element.hasClass("majik_split_pane")) this.element.removeClass("majik_split_pane");
				//return this;
			},

			// balance the user drag of the grab handles
			_balance: function(delta_one, delta_two, total) {
				// Compensate for overdrag by resetting to the min if too much drag (negative)
				// or setting to maximum (total) if too much positive drag (negative
				// complementary delta). Simples.
				return (
					delta_one < this.options["min_" + this._property("dimension")]
						? this.options["min_" + this._property("dimension")]
						: (
							delta_two < this.options["min_" + this._property("dimension")]
								? total - this.options["min_" + this._property("dimension")]
								: delta_one
						)
				);
			},

			// some repetitive dom init - create a node, add it to the dom, init its dimensions
			_append_node: function(tag, classname, cont) {
				var el = $("<" + tag + " class=\"" + classname + " "
					+ "majik_split_pane_" + this.options.orientation  + "\"></" + tag + ">");
				cont.append(el);
				// init height as these are new elements, occupying zero space
				if ("vertical" == this.options.orientation)
					this._dimension(el, this._dimension(cont, undefined, true), true);
				return el;
			},

			// get/set the dimension appropriate for the configured orientation.
			_dimension: function(el, val, invert) {
				return (
					((invert ? "horizontal" : "vertical") == this.options.orientation)
						? el.width(val)
						: el.height(val)
				);
			},

			// convenience map of appropriate properties to use according to configured orientation.
			_property: function(property) {
				return (
					("vertical" == this.options.orientation)
						? {"axis": "x", "position": "left", "dimension": "width"}
						: {"axis": "y", "position": "top", "dimension": "height"}
				)[property];
			}
		}
	);
})(jQuery);
