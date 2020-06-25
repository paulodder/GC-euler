var g
var id_name2graph = {}
var tooltip
const MAX_X_DOMAIN = 13,
  MIN_X_DOMAIN = -1,
  DECIMALS = 2,
  X_IV = 0.2,
  STEP_SIZE = 0.01 // hardcode for now

jQuery.fn.outerHTML = function (s) {
  return s
    ? this.before(s).remove()
    : jQuery('<p>').append(this.eq(0).clone()).html()
}

var id_name2default_selection = {
    hpgc: [0.5, MAX_X_DOMAIN],
    gtex: [MIN_X_DOMAIN, 3],
    pgclc: [0.72, MAX_X_DOMAIN],
    tcga: [2.3, MAX_X_DOMAIN],
    // min_hpgc_pgclc: [0.5, MAX_X_DOMAIN],
  },
  id_name2current_selection = {},
  other_db2mask = {},
  circle_id2fancy_name = {}
// var

// given x value round it to correct precision given the global settings of
// DECIMALS and IV (x is a domain value)
function round_x(x) {
  var out = parseFloat(parseFloat(x).toFixed(DECIMALS))
  return out
}

// given 2-list with left and right domain values of brush current selection,
// return 2-list of actual selection (i.e. prevent empty selection) and sort
// them
function prepare_domain_selection(left_right) {
  left_right.sort(function (a, b) {
    return a - b
  })
  left_right[0] = Math.max(MIN_X_DOMAIN, left_right[0])
  left_right[1] = Math.min(MAX_X_DOMAIN, left_right[1])
  if (left_right[0] == left_right[1]) {
    if (left_right[1] == MAX_X_DOMAIN) {
      left_right[0] -= STEP_SIZE
    } else {
      left_right[1] += STEP_SIZE // Increment max range to prevent non-existent
    }
  }
  return left_right
}

function update_brush_handles(brush_handle_node) {
  var s = d3.event.selection
  if (s == null) {
    return
  }
  // s[0] = Math.max(s[0], 0);
  // s[1] = Math.min(s[1], MAX_X_WIDTH);
  brush_handle_node.attr('display', null).attr('transform', function (d, i) {
    return 'translate(' + s[i] + ',' + 0 + ')'
  })
}

// redraws graphs based on new size
function redraw(id_name) {
  var graph = id_name2graph[id_name]
  graph.draw()
  // var max_expr = d3.max(graph.d3_data, function (d) {
  //   return d.expr;
  // });
  // var size = graph.get_size(),
  //   width = size[0],
  //   height = size[1];
  // // var height = graph.wrapper.height();

  // // set size of svg
  // // graph.svg.attr("width", "100%").attr("height", "100%");

  // // set ranges accordingly
  // graph.x.range([0, width]);
  // graph.y.range([height, 0]).domain([0, graph.max_expr]);

  // // draw line
  // graph.svg.select(`.line`).attr("d", graph.line(graph.d3_data));
  // // .append("path")
  // // .attr("class", "line")
  // .attr("id", `line_${graph.id_name}`)
  //     ;
}

// jQuery.fn.outerHTML = function (s) {
//   return s
//     ? this.before(s).remove()
//     : jQuery("<p>").append(this.eq(0).clone()).html();
// };
function filter_domain(aloi) {
  aloi.sort(function (a, b) {
    return a - b
  })
  aloi[0] = Math.max(MIN_X_DOMAIN, aloi[0])
  aloi[1] = Math.min(MAX_X_DOMAIN, aloi[1])
  if (aloi[0] == aloi[1]) {
    if (aloi[1] == MAX_X_DOMAIN) {
      aloi[0] -= DATA_IV
    } else {
      aloi[1] += DATA_IV // Increment max range to prevent non-existent
    }
  }
  return aloi
}

// If a brush is selecting up to MAX_X_DOMAIN, we include all genes with
// expressions higher than this too
function potentially_cross_status(id_name, current_domain_selection) {
  var ubound_visible, lbound_visible
  var ubound_visible = !(current_domain_selection[1] >= MAX_X_DOMAIN),
    lbound_visible = !(current_domain_selection[0] <= MIN_X_DOMAIN)
  if (ubound_visible) {
    d3.selectAll(`.ubound_${id_name}`).attr('crossed-out', 'false')
  } else {
    d3.selectAll(`.ubound_${id_name}`).attr('crossed-out', 'true')
  }
  if (lbound_visible) {
    d3.selectAll(`.lbound_${id_name}`).attr('crossed-out', 'false')
  } else {
    d3.selectAll(`.lbound_${id_name}`).attr('crossed-out', 'true')
  }
  if (lbound_visible && ubound_visible) {
    $(`#AND_status_${id_name}`).attr('crossed-out', 'false')
  } else {
    $(`#AND_status_${id_name}`).attr('crossed-out', 'true')
  }
  if (lbound_visible || ubound_visible) {
    $(`#OR_status_${id_name}`).attr('crossed-out', 'false')
  } else {
    $(`#OR_status_${id_name}`).attr('crossed-out', 'true')
  }
}

// format number
function format(n) {
  // Use to access data from tsv files
  return parseFloat(Math.round(n / STEP_SIZE) * STEP_SIZE).toFixed(2)
}

// updates values in numeric input boxes and potentially crosses the chart status
function update_numeric_inputs(id_name, current_domain_selection) {
  potentially_cross_status(id_name, current_domain_selection)
  document.getElementById(`input_min_${id_name}`).value = format(
    current_domain_selection[0]
  )
  document.getElementById(`input_max_${id_name}`).value = format(
    current_domain_selection[1]
  )
}

// Update the text that reports how many genes are currently selected for a
// chart
function update_selection_status(id_name, nofgenes_selected, nofgenes_total) {
  if (!isNaN(nofgenes_selected)) {
    d3.select(`#nofgenes_${id_name}`).text(nofgenes_selected)
    d3.select(`#percgenes_${id_name}`).text(
      ` (${format((nofgenes_selected / nofgenes_total) * 100)}%)`
    )
  }
}

function init_venn() {}

function download(filename, text) {
  var element = document.createElement('a')
  element.setAttribute(
    'href',
    'data:text/csv;charset=utf-8,' + encodeURIComponent(text)
  )
  element.setAttribute('download', filename)

  element.style.display = 'none'
  document.body.appendChild(element)

  element.click()

  document.body.removeChild(element)
}

function get_timestamp() {
  var today = new Date()
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}_${today.getHours()}:${today.getMinutes()}`
}

function init_buttons() {
  let venn_div = d3.select('.venn')
  var venn_buttons = venn_div
    .append('div')
    .classed('venn_buttons', true)
    .attr('order', 1)
  venn_buttons
    .append('button')
    .attr('id', 'download_cur_sel')
    .html('Download current selection as .csv')

  venn_buttons
    .append('button')
    .attr('id', 'save_venn')
    .html('Export diagram as .png')

  venn_buttons
    .append('button')
    .attr('id', 'reset_selections')
    .html('Reset default selection criteria')

  $('#download_cur_sel').click(function () {
    var idxs = get_intersection_idxs()
    if (idxs == false) {
      return
    }
    $.ajax({
      method: 'post',
      async: false,
      url: 'download',
      data: {
        idxs: idxs.join(''),
      },
      async: true,
      success: function (data) {
        download(
          `Bruggeman_et_al_2020_current_selection_${get_timestamp()}.csv`,
          data
        )
        // window.location = "download/";
      },
    })
  })

  d3.select('#reset_selections').on('click', function () {
    Object.keys(id_name2graph).forEach(function (id_name) {
      var graph = id_name2graph[id_name]
      //tmpconsole.logg(id_name2default_range[id_name].map(graph.x));
      d3.select(`#brush_${id_name}`).call(
        graph['brush'].move,
        graph['default_selection'].map(graph.x).sort(function (a, b) {
          return a - b
        })
      )
    })
  })

  d3.select('#save_venn').on('click', function () {
    var today = new Date()
    var dd = today.getDate()
    var mm = today.getMonth() + 1
    var yyyy = today.getFullYear()
    var hh = today.getHours()
    var mi = today.getMinutes()
    if (dd < 10) {
      dd = '0' + dd
    }
    if (mm < 10) {
      mm = '0' + mm
    }
    if (hh < 10) {
      hh = '0' + hh
    }
    if (mi < 10) {
      mi = '0' + mi
    }

    var stamp = yyyy + '_' + mm + '_' + dd + '_' + hh + ':' + mi

    var svgs = document.querySelector('.venn svg')

    var svgData = new XMLSerializer().serializeToString(svgs)
    var canvas = document.createElement('canvas')

    canvas.width = d3.select('.venn svg').attr('width')
    canvas.height = d3.select('.venn svg').attr('height')

    var ctx = canvas.getContext('2d')

    var img = document.createElement('img')

    img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(svgData))

    img.onload = function () {
      // window.open(img.src.replace('data:application/octet-stream'));
      // window.href = canvas.toDataURL( "image/png" );
      ctx.drawImage(img, 0, 0)

      var link = document.createElement('a')
      link.download = 'Bruggeman_Venn_' + stamp
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      delete link
    }
  })
}

function Counter(array) {
  var count = {}
  array.forEach((val) => (count[val] = (count[val] || 0) + 1))
  return count
}

class Graph {
  constructor(graph_ind, id_name, tissue_name) {
    id_name2graph[id_name] = this
    this.id_name = id_name
    this.set_default_selection()
    this.tissue_name = tissue_name
    this.graph_ind = graph_ind
    this.wrapper_selector = `.graph-${graph_ind}`
    this.svg_wrapper = d3
      .select(this.wrapper_selector)
      .append('div')
      .classed('svg_wrapper', true)
    this.wrapper = d3
      .select(this.wrapper_selector)
      .attr('id_name', this.id_name)
    this.wrapper.classed(id_name, true)

    var self = this
    $.getJSON(`data/${id_name}.json`, '').done(function (exprs) {
      //tmpconsole.logg("done");
      self.set_domain() // set x domain
      self.parse_data(exprs)
      // console.log("setting")
      // self.set_scales();
      self.set_svg() // add svg element to div
      self.set_title()
      self.set_ax_labels()
      self.init_axes()
      self.set_line()
      self.set_area()
      self.set_selection_statement()
      self.set_brush()
      self.set_input_domain_listener()
      // self.set_scales();
      // self.draw();
      // self.draw();
      self.draw()
      // self.set_svg();
      // self.fill();
      // self.redraw();
    })
  }

  set_title() {
    // var bold_tissue_name = $("<b/>", { html: `${this.tissue_name}` });
    this.wrapper
      .append('text')
      .attr("class", 'title')
      .attr('id_name', this.id_name)
      .attr('id', `graph_title_${this.id_name}`)
      .html(
        `Max. gene expression in <b>${this.tissue_name}</b> (log\u2082 scale)`
      )
  }

  // init x-labels but do not set x and y attributes yet
  set_ax_labels() {
    this.svg
      .append('text')
      .attr("class", 'ylabel')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '1em')
      .text('Number of genes')
  }

  draw_ax_labels() {
    this.svg
      .select('.ylabel')
      // .style("font-size", `${this.margin.left * 0.5}px`)
      .style('font-size', `${this.margin.left * 0.2}pt`)
      .attr('x', -(this.height / 2)) //fixrelative
      .attr('y', 0)
  }

  set_selection_statement() {
    var nofgenes_span = $('<span/>', {
        "class": 'nofgenes',
        id: `nofgenes_${this.id_name}`,
      }),
      percgenes_span = $('<span/>', {
        "class": 'percgenes',
        id: `percgenes_${this.id_name}`,
      })
    // OR because should only be visible if not both are crossed out
    var OR_span = $('<span/>', {
      "class": 'OR_status',
      id: `OR_status_${this.id_name}`,
      html: `whose max. expression in ${this.tissue_name} is`,
    })

    var lower_bound_input = $('<input/>', {
      // "class": `input_domain_${this.id_name}`,
      "class": `lbound_${this.id_name} input_domain_${this.id_name}`,
      id: `input_min_${this.id_name}`,
      type: 'number',
      step: STEP_SIZE,
      min: MIN_X_DOMAIN,
      max: MAX_X_DOMAIN,
    })
    var lower_bound_span = $('<span/>', {
      "class": `lbound_${this.id_name}`,
      id: `lbound_${this.id_name}`,
      html: `above ${lower_bound_input.outerHTML()}`,
    })

    // AND span (should only be visible when both lower and upper spans are visible
    var AND_span = $('<span/>', {
      "class": 'AND_status',
      id: `AND_status_${this.id_name}`,
      html: 'and',
    })

    // Construct the uperbound input and span
    var upper_bound_input = $('<input/>', {
      id: `input_max_${this.id_name}`,
      "class": `ubound_${this.id_name} input_domain_${this.id_name}`,
      type: 'number',
      step: STEP_SIZE,
      min: MIN_X_DOMAIN,
      max: MAX_X_DOMAIN,
    })
    var upper_bound_span = $('<span/>', {
      "class": `ubound_${this.id_name}`,
      id: `ubound_status_${this.id_name}`,
      html: `below ${upper_bound_input.outerHTML()}`,
    })
    // `<p>Selected ${nofgenes_span.outerHTML()}${percgenes_span.outerHTML()} genes ${OR_span.outerHTML()} ${lower_bound_span.outerHTML()} ${AND_span.outerHTML()} ${upper_bound_span.outerHTML()}</p>`
    var selection_statement = $('<div/>', {
      "class": 'selection_statement',
      html: `Selected ${nofgenes_span.outerHTML()}${percgenes_span.outerHTML()} genes ${OR_span.outerHTML()} ${lower_bound_span.outerHTML()} ${AND_span.outerHTML()} ${upper_bound_span.outerHTML()}`,
    })
    // html: $("<p/>", {
    //   html: `Selected ${nofgenes_span.outerHTML()}${percgenes_span.outerHTML()} genes ${OR_span.outerHTML()} ${lower_bound_span.outerHTML()} ${AND_span.outerHTML()} ${upper_bound_span.outerHTML()}`,
    // })
    // .outerHTML(),
    // });
    $(`${this.wrapper_selector}`).append(selection_statement)
    // this.wrapper.(chart_status.outerHTML());

    // // document.getElementByClass;
    // let selection_statement = $("<text/>", {
    //   "class": "selection_statement",
    //   x: "50%",
    //   // .style("font-size", `1pt`)
    //   y: "0%",
    //   width: "100%",
    //   style: "font-size: 1px",
    //   "text-anchor": "middle",
    //   html: $("<nobr/>", {
    //     html: `Selected
    //           <span class="nofgenes" id="nofgenes_${this.id_name}">13468</span>
    //           <span class="percgenes" id="percgenes_${this.id_name}">(89.14%)</span>
    //           genes whose max. expression in ${this.this.tissue_name} is above <input class="input_range_${this.id_name}" id="input_min_${this.id_name}" type="number" step="0.01" min="0" max="13">&nbsp;</p><p id="max_range_max_${this.id_name}">and below <input class="input_range_${this.id_name}" id="input_max_${this.id_name}" type="number" step="0.01" min="0" max="13">`,
    //   }),
    // });

    // // })
    // ;
  }

  // get size of wrapper
  get_size() {
    var wrapper_info = this.svg_wrapper.node().getBoundingClientRect()
    return [wrapper_info.height, wrapper_info.width]
  }

  scale_gridlines() {
    this.y_gridlines
      .scale(this.y)
      .tickSize(-this.width + (this.margin.left + this.margin.right))
    this.x_gridlines
      .scale(this.x)
      .tickSize(-this.height + (this.margin.bottom + this.margin.top))
  }

  scale_brush() {
    // Define boundaries of brush
    this.brush.extent([
      [this.margin.left, this.margin.top],
      [this.width - this.margin.right, this.height - this.margin.bottom],
    ])

    this.scale_brush_resize_path()
    this.svg
      .selectAll(`#handle--custom_${this.id_name}`)
      .attr('d', this.brush_resize_path)
  }

  scale_brush_resize_path() {
    this.brush_resize_path = (d) => {
      // ////tmpconsole.logg(("called");
      var e = +(d.type == 'e')
      var x = e ? 1 : -1
      // var height = this.height - this.margin.bottom;
      // var y = (this.height - this.margin.bottom - this.margin.top) / 3;
      var y = (this.height - this.margin.bottom - this.margin.top) / 3
      var out =
        'M' +
        0.5 * x +
        ',' +
        y +
        'A6,6 0 0 ' +
        e +
        ' ' +
        6.5 * x +
        ',' +
        (y + 6) +
        'V' +
        (2 * y - 6) +
        'A6,6 0 0 ' +
        e +
        ' ' +
        0.5 * x +
        ',' +
        2 * y +
        'Z' +
        'M' +
        2.5 * x +
        ',' +
        (y + 8) +
        'V' +
        (2 * y - 8) +
        'M' +
        4.5 * x +
        ',' +
        (y + 8) +
        'V' +
        (2 * y - 8) +
        'M0,0' +
        'l0,' +
        (this.height - (this.margin.top + this.margin.bottom))
      // //////tmpconsole.logg((out);
      return out
    }
  }

  scale_area() {
    this.area
      .x((d) => {
        return this.x(d.x_value)
      })
      .y0(this.y(0))
      .y1((d) => {
        return this.y(d.expr)
      })
  }

  set_input_domain_listener() {
    var self = this
    // var this_id_name = this.id_name;
    // var this_brush = this.brush;
    // var this_x = this.x;
    d3.selectAll(`.input_domain_${self.id_name}`).on('change', function () {
      var selected_domain = d3
        .selectAll(`.input_domain_${self.id_name}`)
        .nodes()
        .map(function (e) {
          return format(e.value)
        })
      selected_domain = filter_domain(selected_domain)
      selected_domain.map(self.x).sort(function (a, b) {
        return a - b
      })
      d3.select(`#brush_${self.id_name}`).call(
        self.brush.move,
        selected_domain.map(self.x).sort(function (a, b) {
          return a - b
        })
      )
    })
  }

  // Set scales based on current size
  set_scales() {
    // get parent size
    var size = this.get_size()
    this.height = size[0] * 0.95
    this.width = size[1]
    this.svg.attr('width', '100%').attr('height', '100%')

    this.margin = {
      left: 0.065 * this.width,
      right: 0.05 * this.width,
      top: 0.05 * this.height,
      bottom: 0.15 * this.height,
    }
    // width = size[0],
    // height = size[1];
    // Set ranges accordingly
    this.x.range([
      this.margin.left,
      this.width - this.margin.right, // - (this.margin.left + this.margin.right)
    ])
    this.y
      .range([
        this.height - this.margin.bottom, // - (this.margin.top + this.margin.bottom)
        this.margin.top,
      ])
      .domain([0, this.max_expr])

    // Change scales of axes accordingly
    this.yAxis.scale(this.y).tickSize(this.margin.left * 0.05)
    this.xAxis.scale(this.x).tickSize(this.margin.bottom * 0.4)

    this.scale_area()

    this.scale_gridlines()

    this.scale_brush()

    this.scale_text()

    // this.scale_line();

    // Redefine margin in px values

    // // .axisLeft()
    //  // will be redefined later
    // .tickSizeOuter(1)
    // .tickValues(
    //   d3
    //     .range(0, Math.ceil(this.max_expr / 100) * 100, 100)
    //     .concat(Math.ceil(this.max_expr / 100) * 100 + 100)
    // );
  }

  scale_text() {
    this.scale_title()
  }

  scale_title() {
    this.svg
      .select('.title')
      .attr('x', this.width / 2)
      .attr('y', this.margin.top * 1)
      .attr('text-anchor', 'middle')
      .style('font-size', this.margin.top * 1.5)
  }
  draw_brush() {
    this.svg
      .select(`#brush_${this.id_name}`)
      .call(this.brush)
      .call(this.brush.move, this.default_selection.map(this.x))
    var self = this
    this.brush_node
      .selectAll('.overlay')
      .on('mousedown touchstart', function () {
        // if click outside of
        // cur sel, re-set current selection to prevent deselection
        d3.event.stopImmediatePropagation()
        d3.select(this.parentNode)
          .transition()
          .call(self.brush.move, d3.brushSelection(this.parentNode))
      })
  }

  draw_axes() {
    // re-draw y-axis
    this.svg
      .select('#y-axis')
      .attr('transform', `translate(${this.margin.left},0)`)
      .call(this.yAxis)

    // draw x-axis
    this.svg
      .select('#x-axis')
      .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
      .call(this.xAxis)

    // .attr("transform", `translate(,0)`)
    // .attr("y", 0)

    this.draw_gridlines()
    this.draw_ax_labels()
    this.svg
      .select('#x-axis')
      .selectAll('text')
      // .attr("y", `${this.height - this.margin.bottom}px`)
      .attr('y', `${0.6 * this.margin.bottom}px`)
      // .attr("y", `${-0.9 * (0.5 * this.margin.bottom)}px`)
      .style('text-anchor', 'center')
      .style('font-size', `${0.5 * this.margin.bottom}`)
    //   // .attr("transform", "rotate(270)")
  }

  draw_gridlines() {
    this.svg
      .select('#xgrid')
      .attr('transform', `translate(0, ${this.height - this.margin.bottom})`)
      .call(this.x_gridlines)

    this.svg
      .select('#ygrid')
      .attr('transform', `translate(${this.margin.left}, 0)`)
      .call(this.y_gridlines)
  }

  draw_line() {
    this.svg.select('.line').attr('d', this.line(this.d3_data))
  }

  draw() {
    this.set_scales()
    this.draw_axes()
    this.draw_brush()
    this.draw_line()
    return

    // set size of svg

    // draw line
    this.svg
      .append('path')
      .attr("class", 'line')
      .attr('id', `line_${this.id_name}`)
      .attr('d', this.line(this.d3_data)) // do not fill yet, based on brush

    // draw area
    // add title (do earlier)
    this.wrapper
      .append('text')
      .attr('x', '50%')
      .attr('y', '10%')
      .attr('text-anchor', 'middle')
    // .style("font-size", "16px");
    // .style("text-decoration", "")

    // draw yAxis
    this.svg
      .select('#y-axis')
      .attr('transform', 'translate(30, 0)') // should depend on size too
      .call(this.yAxis)

    // Add y label
    this.svg
      .append('text')
      .attr("class", 'ylabel')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0) //0 - margin.left)//fixrelative
      .attr('x', 0) //0 - height / 2)
      .attr('dy', '1em')
      .text('Number of genes')
    // this.svg
    // .append("text")
    // .attr("class", "ylabel")
    // .attr("text-anchor", "middle")
    // .attr("transform", "rotate(-90)")
    // // .attr("y", 0 - margin.left)
    // // .attr("x", 0 - height / 2)
    // .attr("dy", "1em")
    // .text("Number of genes");

    // redraw
    // this.line(this.d3_data);
  }

  set_default_selection() {
    if (Object.keys(id_name2default_selection).includes(this.id_name)) {
      this.default_selection = id_name2default_selection[this.id_name]
    } else {
      this.default_selection = this.domain.slice()
    }
  }

  // redraw according to scale of wrapper div

  set_domain() {
    this.domain = [-1, 13]
  }
  fill() {
    // //tmpconsole.logg(this.exprs);
    var id_name = this.id_name //, 'heRE')
    var this_y = this.y
    var this_yAxis = this.yAxis
    // //////tmpconsole.logg((id_name);
    // id_name = this.id_name;
    var max_expr = d3.max(this.d3_data, function (d) {
      return d.expr
    })
    this.yAxis // tickValues(
    //   d3
    //     .range(0, Math.ceil(max_expr / 100) * 100, 100)
    //     .concat(Math.ceil(max_expr / 100) * 100 + 100)
    // )

    this.yAxis.tickValues(
      d3
        .range(0, Math.ceil(max_expr / 100) * 100, 20)
        .concat(Math.ceil(max_expr / 100) * 100 + 20)
    )
    this.y.domain([0, max_expr])

    // Add area

    // Add line
    this.main_svg
      .append('path')
      .attr("class", 'line')
      .attr('id', `line_${id_name}`)
      .attr('d', this.line(this.d3_data))

    this.main_svg
      .append('text')
      .attr("class", 'ylabel')
      .attr('text-anchor', 'middle')
      .attr('transform', 'rotate(-90)')
      // .attr("y", 0 - margin.left)
      // .attr("x", 0 - height / 2)
      .attr('dy', '1em')
      .text('Number of genes')

    // Add x-axis and ticks
    this.main_svg
      .append('g')
      .attr("class", 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(this.xAxis)
      .selectAll('text')
      .attr('y', 0)
      .attr('x', '-2.2em')
      .attr('dy', '.35em')
      .attr('transform', 'rotate(270)')
      .style('text-anchor', 'start')

    this.main_svg
      .append('g')
      .attr("class", 'ticks axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(this.tickAxis)

    // Add vertical gridlines
    this.main_svg
      .append('g')
      .attr("class", 'x grid')
      .attr('transform', 'translate(0,' + height + ')')
      .call(make_x_gridlines(this.x).tickSize(-height).tickFormat(''))

    // Add horizontal gridlines
    this.main_svg
      .append('g')
      .attr("class", `grid ${id_name}`)
      // .attr("transform", "translate("+width+",0)")
      .call(
        make_y_gridlines(this.y, this.yAxis).tickSize(-WIDTH).tickFormat('')
      )

    // Add y axis
    this.main_svg.append('g').attr("class", 'y axis').call(this.yAxis)

    // Add title to axis
  }

  // set_x2nofgenes(data) {}

  parse_data(data) {
    var x2nofgenes = new Object()
    var relevant_range = d3
      .range(this.domain[0], this.domain[1], 0.01) //hardcode
      .map(round_x)

    relevant_range.forEach(function (val) {
      x2nofgenes[val] = 0
    })
    var rounded_data = [],
      cursum = 0
    var cursum = 0
    var x2nofgenes_under = new Object()
    // console.log("data", data);
    data
      .slice()
      .sort(function (a, b) {
        return parseFloat(a) - parseFloat(b)
      })
      .forEach(function (val, ind) {
        // console.log((val, ind));
        var rounded_value = round_x(val)
        cursum += 1
        x2nofgenes[rounded_value] += 1
        // //tmpconsole.logg(ind, val);
        if (rounded_value >= MAX_X_DOMAIN) {
          rounded_value = MAX_X_DOMAIN
          x2nofgenes_under[MAX_X_DOMAIN] = cursum
          // data[ind] = rounded_value;
        } else if (rounded_value <= MIN_X_DOMAIN) {
          x2nofgenes_under[MIN_X_DOMAIN] = cursum
          rounded_value = MIN_X_DOMAIN
          // data[ind] = rounded_value;
        }
        x2nofgenes_under[rounded_value] = cursum
      })
    // console.log("data", data);
    var rounded_data = []
    data.forEach(function (x, ind) {
      // if (ind == 516) {
      //   console.log("xxx", x, parseFloat(x.toFixed(DECIMALS)));
      // }
      // var rounded_value = parseFloat(x.toFixed(DECIMALS + 1));
      var rounded_value = x
      if (rounded_value >= MAX_X_DOMAIN) {
        rounded_value = MAX_X_DOMAIN
      } else if (rounded_value <= MIN_X_DOMAIN) {
        rounded_value = MIN_X_DOMAIN
      }
      rounded_data.push(rounded_value)
    })

    x2nofgenes_under[MIN_X_DOMAIN] = 0
    var last_cursum,
      // IV_sum = 0,
      d3_data = Array()
    relevant_range.concat([MAX_X_DOMAIN + 0.1]).forEach(function (x, ind) {
      if (x2nofgenes[x] == undefined) {
        x2nofgenes[x] = 0
      }
      if (x2nofgenes_under[x] == undefined) {
        x2nofgenes_under[x] = last_cursum
      }

      last_cursum = x2nofgenes_under[x]
      // if (ind % 10 == 0) {
      //   d3_data.push({
      //     expr: last_cursum - x2nofgenes_under[round_x(x - 0.1)],
      //     x_value: round_x(x),
      //   });
      // }
    })
    var rounded_x2nofgenes = Counter(
      data.map(function (x) {
        return parseFloat(x.toFixed(1))
      })
    )
    var d3_data = []
    d3.range(MIN_X_DOMAIN, MAX_X_DOMAIN + 0.1, 0.1).forEach(function (x) {
      let rounded_x = parseFloat(x.toFixed(1)),
        nofgenes = rounded_x2nofgenes[rounded_x]
      if (nofgenes == undefined) {
        nofgenes = 0
      }
      d3_data.push({ x_value: rounded_x, expr: nofgenes })
    })
    relevant_range.forEach(function (el, ind) {
      // d3_data.push({expr:;
    })
    // d3_data[0]["expr"] = 0;

    // relevant_range.forEach(function (val) {
    //   // cursum += x2nofgenes[val];
    //   // x2nofgenes_under[val] = cursum;
    //   ;
    // });
    this.exprs = data
    this.rounded_exprs = rounded_data
    this.nofgenes_total = cursum
    x2nofgenes_under[MIN_X_DOMAIN] = 0
    x2nofgenes_under[MAX_X_DOMAIN] = cursum
    this.x2nofgenes = x2nofgenes
    this.x2nofgenes_under = x2nofgenes_under
    this.d3_data = d3_data
    this.max_expr = d3.max(this.d3_data, function (d) {
      return d.expr
    })
  }

  draw_brush_handles() {
    var s = d3.event.selection
    if (s == null) {
      return
    }
    // s[0] = Math.max(s[0], 0);
    // s[1] = Math.min(s[1], MAX_X_WIDTH);
    this.svg
      .selectAll('.handle--custom')
      .attr('display', null)
      // .attr("transform", `translate(${this.margin.left},${this.margin.top})`)
      // .attr("transform", `translate(200,${this.margin.top})`)
      .attr('transform', (d, i) => {
        return `translate(${s[i]}, ${this.margin.top})`
      })
  }

  // {
  //     update_brush_handles(d3.selectAll(`#handle--custom_${self.id_name}`))

  // }

  init_axes() {
    this.set_x()
    this.set_xAxis()
    this.set_y()
    this.set_yAxis()
    this.set_gridlines()
    // this.set_tickAxis();
  }

  set_gridlines() {
    this.set_x_gridlines()
    this.set_y_gridlines()
  }

  set_x_gridlines() {
    this.x_gridlines = d3
      .axisBottom(this.x)
      // .tickValues(d3.range(...this.domain, X_IV)) // perhaps dynamically change
      .tickSizeOuter(0)
      .tickFormat('')

    // also add them to dom
    this.svg.append('g').attr("class", 'grid').attr('id', 'xgrid')
  }

  set_y_gridlines() {
    this.y_gridlines = d3
      .axisLeft(this.y)
      // .tickValues(d3.range(0, this.max_expr, 20)) // perhaps dynamically change
      .tickSizeOuter(0)
      .tickFormat('')

    this.svg.append('g').attr("class", 'grid').attr('id', 'ygrid')
    // .tickValues(this.yAxis.tickValues());
    // d3.axisLeft(scale).tickValues(yaxis.tickValues());
  }

  set_x() {
    this.x = d3
      .scaleLinear()
      // .range([0, WIDTH]) // postponed
      .domain(this.domain)
  }

  set_xAxis() {
    this.xAxis = d3.axisBottom(this.x).tickFormat(d3.format('.1f'))
    // .tickValues(d3.range(this.domain[0], this.domain[1], 0.4));

    // add it as well
    this.svg.append('g').attr("class", 'x axis').attr('id', 'x-axis')
  }

  // set_tickAxis() {
  //   this.tickAxis = d3
  //     .axisBottom(this.x)
  //     .tickFormat("")
  //     .tickSize(4)
  //     .tickValues(d3.range(MIN_X_DOMAIN, MAX_X_DOMAIN, 0.2));
  // }

  set_y() {
    this.y = d3.scaleLinear() // .range([height, 0])
  }

  set_yAxis() {
    this.yAxis = d3
      .axisLeft()
      .scale(this.y) // will be redefined later
      .tickSizeOuter(1)
      .tickValues(
        d3
          .range(0, Math.ceil(this.max_expr / 100) * 100, 100)
          .concat(Math.ceil(this.max_expr / 100) * 100 + 100)
      )

    // add as well
    this.svg.append('g').attr("class", 'y axis').attr('id', 'y-axis')
  }

  set_line() {
    // var x = this.x;
    // var y = this.y;
    this.line = d3
      .line()
      .curve(d3.curveBasis)
      .x((d) => {
        return this.x(d.x_value)
      })
      .y((d) => {
        return this.y(d.expr)
      })

    // add dom element too
    this.svg
      .append('path')
      .attr("class", 'line')
      .attr('id', `line_${this.id_name}`)
  }

  set_area() {
    // var id_name = this.id_name;
    this.area = d3.area().curve(d3.curveBasis)

    this.svg
      .append('path')
      .attr("class", 'area')
      .attr('id', `area_${this.id_name}`)
  }

  set_svg() {
    this.svg = this.svg_wrapper //  = d3
      // .select(this.wrapper_selector)
      // .select(`#expr_${this.id_name}`)
      // .attr("width", WIDTH + margin.left + margin.right)
      // .attr("height", height + margin.bottom + margin.top)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '65%')
      .attr('id_name', this.id_name)
      .classed('graph-svg', true)
    // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  }
  // init vars used below

  set_brush() {
    // var self_id_name = this.id_name;
    var self = this
    this.brush = d3
      .brushX()
      .extent([
        [0, 0],
        [this.width, this.height],
      ])
      .on('brush', function (d) {
        // Change position of handles based on current position
        self.draw_brush_handles()

        // Get current range and domain selected by brush
        var current_range_selection = d3.event.selection
        // console.log(current_range_selection, "current_range_selection");
        // var current_range_selection = [10, 20];
        var current_domain_selection = prepare_domain_selection(
          current_range_selection.map(self.x.invert)
        )
        // console.log(current_domain_selection, "current_domain_selection");
        self.update_current_selection(current_domain_selection)

        // If brush selects up to and incl either left or right boundary,
        // cross out text accordingly
        update_numeric_inputs(self.id_name, current_domain_selection)
        // Compute current number of genes selected
        var nofgenes_selected =
          self.x2nofgenes_under[round_x(current_domain_selection[1])] -
          self.x2nofgenes_under[round_x(current_domain_selection[0])]
        // Update reporter of number of currently selected genes
        update_selection_status(
          self.id_name,
          nofgenes_selected,
          self.nofgenes_total
          // current_range_selection
        )
        // Select the right subset of the data corresponding to current
        // selection, and feed it to the area so it is displayed
        var start_idx = math.ceil(
          ((current_domain_selection[0] - MIN_X_DOMAIN) /
            (MAX_X_DOMAIN - MIN_X_DOMAIN)) *
            (self.d3_data.length - 1)
        )
        var end_idx = math.floor(
          ((current_domain_selection[1] - MIN_X_DOMAIN) /
            (MAX_X_DOMAIN - MIN_X_DOMAIN)) *
            (self.d3_data.length - 1) +
            1
        )
        // var start_idx = math.ceil(
        //   ((current_range_selection[0] - self.margin.left) /
        //     (self.width - (self.margin.left + self.margin.right))) *
        //     // (self.width - (self.margin.left + self.margin.right))) *
        //     self.d3_data.length
        // )
        // ,
        // end_idx =
        //   math.floor(
        //     ((current_range_selection[1] - self.margin.left) /
        //       (self.width - (self.margin.left + self.margin.right))) *
        //       self.d3_data.length
        //   ) + 1
        // ;

        // console.log(
        //   "corresponding x_value",
        //   self.x.invert(current_range_selection[0]),
        //   self.d3_data[start_idx]
        // );
        // if (
        //   self.x.invert(current_range_selection[0]) <
        //   self.d3_data[start_idx]["x_value"]
        // ) {
        //   start_idx += 1;
        // }
        // if (self.x.invert(end_idx) > current_range_selection[1]) {
        //   end_idx -= 1;
        // }
        var selected_data = self.d3_data.slice(start_idx, end_idx)
        var current_last = selected_data[selected_data.length - 1],
          current_first = selected_data[0]
        // assume linearity on such small interval
        // selected_data.push({
        //   expr: findYatXbyBisection(
        //     current_domain_selection[1],
        //     self.svg.select(".line"),
        //     0
        //   ),
        //   x_value: current_domain_selection[1],
        // })
        if (
          current_last['x_value'] < current_domain_selection[1] &&
          current_last['x_value'] != MAX_X_DOMAIN
        ) {
          var next_el = self.d3_data[end_idx]
          if (next_el != undefined) {
            let desired_x_value = current_domain_selection[1],
              weighted_avg_expr =
                (current_last['expr'] * math.abs(desired_x_value % 0.1) +
                  next_el['expr'] * 0.1 -
                  math.abs(desired_x_value % 0.1)) /
                0.1
            selected_data.push({
              x_value: desired_x_value,
              expr: weighted_avg_expr,
            })
            // console.log(
            //   "new endpoints",
            //   current_domain_selection,
            //   selected_data[selected_data.length - 1]
            // )
          }
        }
        if (
          current_first['x_value'] > current_domain_selection[0] &&
          current_last['x_value'] > MIN_X_DOMAIN
        ) {
          var previous_el = self.d3_data[start_idx - 1]
          if (previous_el != undefined) {
            let desired_x_value = current_domain_selection[0],
              weighted_avg_expr =
                (current_first['expr'] *
                  (0.1 - math.abs(desired_x_value % 0.1)) +
                  previous_el['expr'] * math.abs(desired_x_value % 0.1)) /
                0.1
            selected_data.unshift({
              x_value: desired_x_value,
              expr: weighted_avg_expr,
            })
            // console.log(
            //   "new endpoints",
            //   current_domain_selection[0],
            //   selected_data[0]
            // )
          }
        }
        // selected_data[0]["x_value"] = self.x.invert(current_range_selection[0]);
        // selected_data[selected_data.length - 1]["x_value"] = self.x.invert(
        //   current_range_selection[1]
        // );
        // selected_data.unshift(weighted_expr_mean(start_idx
        self.svg.select('.area').attr('d', self.area(selected_data))
      })
      .on('end', function () {
        var cur_selection = d3.event.selection
        // var cur_selection = [1, 2];
        // Prevent empty brush selection just in case
        if (cur_selection == null) {
          cur_selection = self.current_selection
          // Get current domain according to numeric inputs
          //   cur_selection = d3
          // .selectAll(`.input_range_${self.id_name}`)
          // .nodes()
          // .map(function (e) {
          //   return round_x(e.value);
          // });
          // Update the brush according to numeric inputs
          d3.select(`#brush_${self.id_name}`).call(
            self.brush.move,
            cur_selection.map(self.x)
          )
        }
        id_name2current_selection[self.id_name] = cur_selection
        // Update venn diagram with new selection
        update_venn()
      })

    // Append brush to dom
    this.brush_node = this.svg
      .append('g')
      .attr("class", 'brush')
      .attr('id', `brush_${this.id_name}`)

    // add brush handles
    this.brush_node
      .selectAll('.handle--custom')
      .data([
        {
          type: 'w',
        },
        {
          type: 'e',
        },
      ])
      .enter()
      .append('path')
      .attr("class", 'handle--custom')
      .attr('id', `handle--custom_${this.id_name}`)
      .attr('stroke', '#000')
      .attr('cursor', 'ew-resize')
  }

  update_current_selection(cur_sel) {
    this.current_selection = cur_sel
  }

  // get mask for current selection
  get_mask() {
    var mask = []
    let current_sel = this.current_selection
    if (this.rounded_exprs == undefined) {
      return false
    }
    this.rounded_exprs.forEach(function (expr, ind) {
      if ((current_sel[0] <= expr) & (expr <= current_sel[1])) {
        mask.push(1)
      } else {
        mask.push(0)
      }
    })
    return mask
  }

  // }
}

function element_wise_func(arr0, arr1, func) {
  var out = []
  arr0.forEach(function (el, ind) {
    out.push(func(el, arr1[ind]))
  })
  return out
}

// map the name of each graph to an array that where the ith element is 1 iff
// the ith gene satisfies the current selection
function get_masks() {
  out = new Object()
  Object.keys(id_name2graph).forEach(function (id_name) {
    let graph = id_name2graph[id_name]
    let mask = graph.get_mask()
    if (mask == false) {
      return
    }
    out[id_name] = mask
  })
  return out
}

//     d3.selectAll(".graph-svg").nodes().map(function() {(d3.select(this).attr)})
//         each(function () {
//         var id_name = this.attr("id_name")
//         console.log(id_name)})
//     var not_all_ready = false;
//     // var graph_els = $(this).children(".graph_wrapper"),
//     //   multi_graph_name = $(this).attr("name"),
//     //   graph_masks = [];
//     // graph_els.each(function () {
//     var id_name = $(this).attr("id").split("_")[1];
//     console.log(id_name);
//     var this_graph_mask = get_graph_mask(id_name);
//     if (this_graph_mask == false) {
//       not_all_ready = true;
//     }
//     graph_masks.push(this_graph_mask);
//     console.log(graph_masks);
//     if (not_all_ready) {
//       console.log("here", multi_graph_name);
//       return;
//     }
//     console.log(graph_masks);
//     if (graph_els.length == 1) {
//       out[multi_graph_name] = graph_masks[0];
//     } else {
//       // must be the pgc one
//       var operator = $("#pgc_operator").find("option:selected").attr("value");
//       console.log(operator, graph_masks);
//       if (operator == "OR") {
//         var mask = graph_masks.reduce(element_wise_max);
//       } else {
//         var mask = graph_masks.reduce(element_wise_min);
//       }
//       out[multi_graph_name] = mask;
//     }
//   });
//   return out;
// }

// get array with 0/1 at locations where the correspoding gene is in all 3 subsets
function get_intersection_idxs() {
  var masks = get_masks()
  if (Object.keys(masks).length != 4) {
    return false
  }
  // combine the hpgc pgclc mask into one
  var hpgc_mask = masks['hpgc'],
    pgclc_mask = masks['pgclc']
  // if (d3.select('#pgc_operator')
  if ($('#pgc_operator').find('option:selected').attr('value') == 'AND') {
    masks['hpgc-pgclc'] = [hpgc_mask, pgclc_mask].reduce(function (a, b) {
      return element_wise_func(a, b, math.min)
    })
  } else if ($('#pgc_operator').find('option:selected').attr('value') == 'OR') {
    masks['hpgc-pgclc'] = [hpgc_mask, pgclc_mask].reduce(function (a, b) {
      return element_wise_func(a, b, math.max)
    })
  }

  delete masks['hpgc']
  delete masks['pgclc']
  // return intersection of all 3
  return Object.values(masks).reduce(function (a, b) {
    return element_wise_func(a, b, math.min)
  })
}

//   var out = [],
//     arr0 = Object.values(masks)[0],
//     arr1 = Object.values(masks)[1],
//     arr2 = Object.values(masks)[2];
//   arr0.forEach(function (el, ind) {
//     // //tmpconsole.logg([arr0[ind], arr1[ind], arr2[ind]]);
//     // //tmpconsole.logg(Math.min(arr0[ind], arr1[ind], arr2[ind]));
//     out.push(Math.min(arr0[ind], arr1[ind], arr2[ind]));
//   });
//   return out;
// }

// initializes global variable
function init_other_db2mask() {
  $.getJSON(`data/CT.json`, '').done(function (data) {
    other_db2mask['CT'] = data
    circle_id2fancy_name[
      'CT'
    ] = `Wang et al. 2006 & Almeida et al. 2009 (n = 1128)`
  })
  $.getJSON(`data/brug2017.json`, '').done(function (data) {
    other_db2mask['brug2017'] = data
    circle_id2fancy_name['brug2017'] = `Bruggeman et al. 2017 (n = 756)`
    circle_id2fancy_name['current_selection'] = 'Current Selection'
  })
}

function update_venn() {
  var inters_idxs = get_intersection_idxs()
  if (inters_idxs == false) {
    console.log('Postponing update of venn diagram. Waiting for charts')
    return
  }
  var circle_id2mask = {
    ...{ current_selection: inters_idxs },
    ...other_db2mask,
  }
  var circle_ids = Object.keys(circle_id2mask)
  var rows = []
  var new_array_set_sizes = []
  var combs = [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]]
  var subset_name2size = {}
  combs.forEach(function (idxs) {
    //tmpconsole.logg(idxs);
    var first_circle_id = circle_ids[idxs[0]]
    var all_true = circle_id2mask[first_circle_id].slice()
    var set_abbrev = [[circle_id2fancy_name[first_circle_id]]]
    idxs.slice(1).forEach(function (row_idx) {
      var circle_id = circle_ids[row_idx],
        other_mask = circle_id2mask[circle_id]
      set_abbrev.push([circle_id2fancy_name[circle_id]])
      other_mask.map(function (el, i) {
        all_true[i] = math.min(el, all_true[i])
      })
    })
    var subset_size = math.sum(all_true)
    subset_name2size[set_abbrev] = subset_size
    new_array_set_sizes.push({ sets: set_abbrev, size: subset_size })
    console.log(new_array_set_sizes)
  })
  // venn_div.datum(new_array_set_sizes).call(vennChart);
  // vennChart = venn.VennDiagram(subset_name2size);
  let parent_div_info = d3
      .select('.venn_svg_wrapper')
      .node()
      .getBoundingClientRect(),
    desired_size = [0.9 * parent_div_info.height, 0.9 * parent_div_info.width]
  // .getElementById(".venn")
  // .getBoundingClientRect(),

  // console.log("parent_div_info", desired_size);
  // parent_div_info.se
  let venn_svg = d3.select('.venn_svg_wrapper')
  // var vd = venn_div
  venn_svg
    .datum(new_array_set_sizes)
    .call(venn.VennDiagram(subset_name2size, desired_size))

  // vd.call();
  // venn_div.datum(new_array_set_sizes).call(vennChart);
  add_tooltips()
  // var new_array_set_sizes = [
  //   // Variable
  //   { sets: setAbbrevs["1"], size: set_sizes[0] },
  //   { sets: setAbbrevs["4"], size: set_sizes[1] },
  //   { sets: setAbbrevs["6"], size: set_sizes[2] },
  //   { sets: setAbbrevs["7"], size: set_sizes[3] },

  //   // Fixed size
  //   { sets: setAbbrevs["2"], size: 255 },
  //   { sets: setAbbrevs["3"], size: 1019 },
  //   { sets: setAbbrevs["5"], size: 146 },
  // ];

  // all_true
  //   var rel_mat = mat.subset(math.index.apply(null, idxs));
  //   //tmpconsole.logg(rel_mat);
  //   if (idxs.length >= 1) {
  //     math.apply(rel_mat, 0, math.min);
  //   } else {
  //     var conjunct_row = rel_mat;
  //   }
  //   var card = math.sum(conjunct_row);
  //   //tmpconsole.logg(idxs, card);
  // });
}

function add_tooltips() {
  var tooltip = d3.select('.venntooltip').style('display', 'none')
  // add listeners to all the groups to display tooltip on mouseover
  venn_div = d3.select('.venn')
  venn_div
    .selectAll('g')
    .on('mouseover', function (d, i) {
      tooltip.style('display', 'inline')
      // sort all the areas relative to the current item
      venn.sortAreas(venn_div, d)

      // Display a tooltip with the current size
      tooltip.transition().duration(400).style('opacity', 0.9)
      tooltip.text(d.size + ' genes')

      // highlight the current path
      var selection = d3.select(this).transition('tooltip').duration(400)
      selection
        .select('path')
        .style('stroke-width', 3)
        .style('fill-opacity', d.sets.length == 1 ? 0.6 : 0.1)
        .style('stroke-opacity', 1)
    })

    .on('mousemove', function () {
      // Insert mult with 1.5 cause everything is
      // scaled
      tooltip
        .style('left', d3.event.pageX + 'px')
        .style('top', d3.event.pageY - 28 + 'px')
    })

    .on('mouseout', function (d, i) {
      tooltip.transition().duration(400).style('opacity', 0)
      var selection = d3
        .select(this)
        .transition('tooltip')
        .duration(400)
        .select('path')
        .style('stroke-width', 0)
        .style('fill-opacity', d.sets.length == 1 ? 0.4 : 0.0)
        .style('stroke-opacity', 0)
    })
}

function add_hover_venn_statement() {
  $(`.venn_statement`).hover(
    function () {
      var id_name = d3.select(this).attr('id_name')
      d3.selectAll(`.graph:not([id_name='${id_name}'`).classed(
        'hover_fade',
        true
      )
    },
    function () {
      d3.selectAll(`.graph`).classed('hover_fade', false) // ;
    }
  )
  $('#pgc_operator_span').hover(
    function () {
      d3.selectAll(`.graph.gtex,.graph.tcga`).classed('hover_fade', true) // $(`.graph_wrapper`).each(function () {
    },

    function () {
      d3.selectAll(`.graph.gtex,.graph.tcga`).classed('hover_fade', false)
    }
  )
  var venn_div = d3.select('.venn')
  $(`#venn_statement_current_selection`).hover(
    function () {
      venn.sortAreas(venn_div, { sets: ['Current Selection'], size: 672 })
      // venn.sortAreas(venn_div, $("[data-venn-sets='Current Selection']"));
      $('.venn-circle').each(function () {
        if ('Current Selection' != $(this).attr('data-venn-sets')) {
          $(this).addClass('hover_fade_circle')
          $(this).find('*').addClass('hover_fade_circle')
        }
      })
    },
    function () {
      $('.venn-circle').each(function () {
        $(this).removeClass('hover_fade_circle')
        $(this).find('*').removeClass('hover_fade_circle')
      })
    }
  )
}

document.addEventListener('DOMContentLoaded', () => {
  tooltip = d3
    .select('.venn')
    .append('div')
    .attr("class", 'venntooltip')
    .style('display', 'none')
  init_buttons()
  init_other_db2mask()
  g = new Graph(0, 'hpgc', 'human primordial germ cells')
  g = new Graph(1, 'pgclc', 'PGC-like cells ')
  g = new Graph(2, 'gtex', 'somatic tissues')
  g = new Graph(3, 'tcga', 'tumors')
  const graphsElem = document.querySelector('#graphs')
  const elems = [
    'graph-0',
    'graph-1',
    'graph-2',
    'graph-3',
    'venn',
    'info',
  ].map((n) => `display-${n}`)
  const removeOldClasses = () => {
    elems.forEach((elem) => graphsElem.classList.remove(elem))
  }
  const display = (name) => {
    removeOldClasses()
    graphsElem.classList.add(`display-${name}`)
  }
  document
    .querySelectorAll('.button')
    .forEach((btn) =>
      btn.addEventListener('click', () => display(btn.dataset.display))
    )
  window.addEventListener('resize', function () {
    Object.keys(id_name2graph).forEach(function (id_name) {
      redraw(id_name)
    })
  })

  $('#pgc_operator')
    .on('change', function () {
      update_venn()
    })
    .trigger('change')
  add_hover_venn_statement()
  // $(window).trigger("resize");
})
