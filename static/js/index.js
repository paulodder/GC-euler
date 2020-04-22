// const $ = require('jquery')
// const d3 = require('d3')
// Hardcode first setting of checkConds to prevent initialization errors
window.sessionStorage.setItem("checkConds", "1.6,13--0,1.8--6.2,13");
const PERC_DIV = 15901 / 100;
const vennMargin = { top: 30, bottom: 0, left: 30, right: 30 };
const vennWidth = 1000 - vennMargin.left - vennMargin.right;
const vennHeight = 1000 - vennMargin.top - vennMargin.bottom;
// ////tmpconsole.logg(("HERE");
// Fix empty selection upon
const IV = 0.01;
const DECIMALS = 2;
const MAX_X_WIDTH = 650;
const MAX_X_DOMAIN = 13;
const MIN_X_DOMAIN = -1;
const DATA_IV = 0.01;
const X_IV = 0.4;

var other_db2bool_idxs = {};

var id_name2histo_object = {};
// id_name2default_range = {};
// De default inclusiecriteria zijn:
// - hPGC expr >0,50 (kolom I) OF  PGCLC expr >0,72 (kolom J)
// - GTEx expr <3,0 (kolom M)
// - TCGA expr >2,4 (kolom N)

var id_name2default_range = {
  hpgc: [0.5, MAX_X_DOMAIN],
  gtex: [MIN_X_DOMAIN, 3],
  pgclc: [0.72, MAX_X_DOMAIN],
  tcga: [2.4, MAX_X_DOMAIN],
};

// var CHARTS = []
// var CHARTS_to_be_made= []
var ACTIVE_ID_NAME2CURRENT_SELECTION = new Object();

function sortByKey(array, key) {
  return array.sort(function (a, b) {
    var x = a[parseFloat(key)];
    var y = b[parseFloat(key)];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

function round_to_n_decimals(n, decimals) {
  var multi = 10 ** decimals;
  return Math.round(n * multi) / multi;
}

function range(min, max, step, decimal) {
  var arr = [];
  var cur = min;
  var current_mult = min / step;
  arr.push(min);
  while (true) {
    arr.push(round_to_n_decimals((current_mult += 1) * step, decimal));
    if (current_mult * step >= max) {
      break;
    }
  }
  return arr;
}

function update_brush_handles(brush_handle_node) {
  var s = d3.event.selection;
  if (s == null) {
    return;
  }
  // s[0] = Math.max(s[0], 0);
  s[1] = Math.min(s[1], MAX_X_WIDTH);
  brush_handle_node.attr("display", null).attr("transform", function (d, i) {
    return "translate(" + s[i] + "," + 0 + ")";
  });
}

// given 2-list with left and right domain values of brush current selection,
// return 2-list of actual selection (i.e. prevent empty selection) and sort
// them
function prepare_domain_selection(left_right) {
  left_right.sort(function (a, b) {
    return a - b;
  });
  left_right[0] = Math.max(MIN_X_DOMAIN, left_right[0]);
  left_right[1] = Math.min(MAX_X_DOMAIN, left_right[1]);
  if (left_right[0] == left_right[1]) {
    if (left_right[1] == MAX_X_DOMAIN) {
      left_right[0] -= DATA_IV;
    } else {
      left_right[1] += DATA_IV; // Increment max range to prevent non-existent
    }
  }
  return left_right;
}

// updates values in numeric input boxes and potentially crosses the chart status
function update_numeric_inputs(id_name, current_domain_selection) {
  potentially_cross_status(id_name, current_domain_selection);
  document.getElementById(`input_min_${id_name}`).value = format(
    current_domain_selection[0]
  );
  document.getElementById(`input_max_${id_name}`).value = format(
    current_domain_selection[1]
  );
}

// if a brush is selecting up to MAX_X_DOMAIN, we include all genes with
// expressions higher than this too
function potentially_cross_status(id_name, current_domain_selection) {
  if (current_domain_selection[1] >= MAX_X_DOMAIN) {
    d3.select(`#max_range_max_${id_name}`).attr("crossed-out", "true");
    d3.select(`#input_max_${id_name}`).attr("crossed-out", "true");
  } else {
    d3.select(`#max_range_max_${id_name}`).attr("crossed-out", "false");
    d3.select(`#input_max_${id_name}`).attr("crossed-out", "false");
    d3.select(`#max_range_max_${id_name}`).style("visibility", "initial");
  }
}
// Given range (or extent) of brush, returns limited range to prevent values
// out-of-range to be registered, e.g. [1.6, 10]
function filter_range(aloi) {
  aloi.sort(function (a, b) {
    return a - b;
  });
  aloi[0] = Math.max(MIN_X_DOMAIN, aloi[0]);
  aloi[1] = Math.min(MAX_X_DOMAIN, aloi[1]);
  if (aloi[0] == aloi[1]) {
    if (aloi[1] == MAX_X_DOMAIN) {
      aloi[0] -= DATA_IV;
    } else {
      aloi[1] += DATA_IV; // Increment max range to prevent non-existent
    }
  }
  return aloi;
}

// Given range (or extent) of brush, returns limited range to prevent values
// out-of-range to be registered, e.g. [1.6, 10]
function filter_domain(aloi) {
  aloi.sort(function (a, b) {
    return a - b;
  });
  aloi[0] = Math.max(MIN_X_DOMAIN, aloi[0]);
  aloi[1] = Math.min(MAX_X_DOMAIN, aloi[1]);
  if (aloi[0] == aloi[1]) {
    if (aloi[1] == MAX_X_DOMAIN) {
      aloi[0] -= DATA_IV;
    } else {
      aloi[1] += DATA_IV; // Increment max range to prevent non-existent
    }
  }
  return aloi;
}

var findYatXbyBisection = function (x, path, error) {
  var length_end = path.getTotalLength();
  var length_start = 0;
  var point = path.getPointAtLength((length_end + length_start) / 2); // get the middle point
  var bisection_iterations_max = 50;
  var bisection_iterations = 0;

  error = error || 0.01;

  while (x < point.x - error || x > point.x + error) {
    // get the middle point
    point = path.getPointAtLength((length_end + length_start) / 2);

    if (x < point.x) {
      length_end = (length_start + length_end) / 2;
    } else {
      length_start = (length_start + length_end) / 2;
    }

    // Increase iteration
    if (bisection_iterations_max < ++bisection_iterations) {
      break;
    }
  }
  return point.y;
};

function round(n) {
  return Math.round(n / IV) * IV;
}

function format(n) {
  // Use to access data from tsv files
  return parseFloat(Math.round(n / IV) * IV).toFixed(2);
}
// ////tmpconsole.logg(("U")
function default_type(d) {
  Object.keys(d).forEach(function (key) {
    if (key == "#H:hugo" || key == "probeset") {
    } else {
      d[k] = +d[k];
    }
    // //////tmpconsole.logg((key, d[0][key]);
  });
}

function max_metric(arr) {
  arr.reduce(function (a, b) {
    return Math.max(a, b);
  });
}

// function compute_metric(fname, metric) {
//   var out = {};
//   d3.tsv(fname, default_type, function (data) {
//     data.forEach(function (d) {
//       out[d.probeset] = metric(
//         Object.values(d).filter(function (x) {
//           typeof x === "number";
//         })
//       );
//     });
//   });
//   return out;
// }

// GRAPHS-----------------------------------------------------------------------
// Start drawing of graphs
const margin = {
  top: 30,
  left: 50,
  right: 50,
  bottom: 50,
};
// var margin = {top: 20, left: 33, right: 33, bottom: 33}
var WIDTH = 750 - margin.left - margin.right;
var height = 250 - margin.top - margin.bottom;

function make_x_gridlines(x) {
  return d3
    .axisBottom(x)
    .tickValues(d3.range(MIN_X_DOMAIN, MAX_X_DOMAIN, 0.2))
    .tickSizeOuter(0);
}

function make_y_gridlines(scale, yaxis) {
  return d3.axisLeft(scale).tickValues(yaxis.tickValues());
}

class histo {
  constructor(id_name) {
    this.id_name = id_name;
    var current_n = 0;
    // this.set_data().then(function () {
    //   //tmpconsole.logg(this);
    //   this.fill(this.exprs);
    // });
    this.set_axes();
    // this.add_venn_circle()
  }

  set_input_range_listener() {
    var this_id_name = this.id_name;
    var this_brush = this.brush;
    var this_x = this.x;
    d3.selectAll(`.input_range_${this_id_name}`).on("change", function () {
      var newRange = d3
        .selectAll(`.input_range_${this_id_name}`)
        .nodes()
        .map(function (e) {
          return round(e.value);
        });
      newRange = filter_range(newRange);
      newRange.map(this_x).sort(function (a, b) {
        return a - b;
      });
      d3.select(`#brush_${this_id_name}`).call(
        this_brush.move,
        newRange.map(this_x).sort(function (a, b) {
          return a - b;
        })
      );
    });
  }
  fill() {
    // //tmpconsole.logg(this.exprs);
    var id_name = this.id_name; //, 'heRE')
    var this_y = this.y;
    var this_yAxis = this.yAxis;
    // //////tmpconsole.logg((id_name);
    // id_name = this.id_name;
    var max_expr = d3.max(this.d3_data, function (d) {
      return d.expr;
    });
    this.yAxis.tickValues(
      d3
        .range(0, Math.ceil(max_expr / 100) * 100, 100)
        .concat(Math.ceil(max_expr / 100) * 100 + 100)
    );

    this.yAxis.tickValues(
      d3
        .range(0, Math.ceil(max_expr / 100) * 100, 20)
        .concat(Math.ceil(max_expr / 100) * 100 + 20)
    );
    this.y.domain([0, max_expr]);

    // Add area
    this.main_svg
      .append("path")
      .attr("class", "area")
      .attr("id", `area_${id_name}`);

    // Add line
    this.main_svg
      .append("path")
      .attr("class", "line")
      .attr("id", `line_${id_name}`)
      .attr("d", this.line(this.d3_data));

    this.main_svg
      .append("text")
      .attr("class", "ylabel")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x", 0 - height / 2)
      .attr("dy", "1em")
      .text("Number of genes");

    // Add x-axis and ticks
    this.main_svg
      .append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(this.xAxis)
      .selectAll("text")
      .attr("y", 0)
      .attr("x", "-2.2em")
      .attr("dy", ".35em")
      .attr("transform", "rotate(270)")
      .style("text-anchor", "start");

    this.main_svg
      .append("g")
      .attr("class", "ticks axis")
      .attr("transform", "translate(0," + height + ")")
      .call(this.tickAxis);

    // Add vertical gridlines
    this.main_svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", "translate(0," + height + ")")
      .call(make_x_gridlines(this.x).tickSize(-height).tickFormat(""));

    // Add horizontal gridlines
    this.main_svg
      .append("g")
      .attr("class", `grid ${id_name}`)
      // .attr("transform", "translate("+width+",0)")
      .call(
        make_y_gridlines(this.y, this.yAxis).tickSize(-WIDTH).tickFormat("")
      );

    // Add y axis
    this.main_svg.append("g").attr("class", "y axis").call(this.yAxis);

    // Add title to axis
  }

  parse_data(data) {
    var x2nofgenes = new Object();
    var relevant_range = range(MIN_X_DOMAIN, MAX_X_DOMAIN, IV, 2);
    relevant_range.forEach(function (val) {
      x2nofgenes[val] = 0;
    });
    var rounded_data = [],
      cursum = 0;
    var cursum = 0;
    var x2nofgenes_under = new Object();
    data
      .slice()
      .sort(function (a, b) {
        return parseFloat(a) - parseFloat(b);
      })
      .forEach(function (val, ind) {
        var rounded_value = round_to_n_decimals(parseFloat(val), DECIMALS);
        cursum += 1;
        x2nofgenes[rounded_value] += 1;
        // //tmpconsole.logg(ind, val);
        if (rounded_value >= MAX_X_DOMAIN) {
          rounded_value = MAX_X_DOMAIN;
          x2nofgenes_under[MAX_X_DOMAIN] = cursum;
          // data[ind] = rounded_value;
        } else if (rounded_value <= MIN_X_DOMAIN) {
          x2nofgenes_under[MIN_X_DOMAIN] = cursum;
          rounded_value = MIN_X_DOMAIN;
          // data[ind] = rounded_value;
        }
        x2nofgenes_under[rounded_value] = cursum;
      });
    var rounded_data = [];
    data.forEach(function (x) {
      var rounded_value = round_to_n_decimals(parseFloat(x), DECIMALS);
      if (rounded_value >= MAX_X_DOMAIN) {
        rounded_value = MAX_X_DOMAIN;
      } else if (rounded_value <= MIN_X_DOMAIN) {
        rounded_value = MIN_X_DOMAIN;
      }
      rounded_data.push(rounded_value);
    });

    x2nofgenes_under[MIN_X_DOMAIN] = 0;
    var last_cursum,
      d3_data = Array();
    relevant_range.forEach(function (x) {
      if (x2nofgenes[x] == undefined) {
        x2nofgenes[x] = 0;
      }
      if (x2nofgenes_under[x] == undefined) {
        x2nofgenes_under[x] = last_cursum;
      }
      last_cursum = x2nofgenes_under[x];
      d3_data.push({
        x_value: x,
        expr: x2nofgenes[x],
      });
    });
    // relevant_range.forEach(function (val) {
    //   // cursum += x2nofgenes[val];
    //   // x2nofgenes_under[val] = cursum;
    //   ;
    // });
    this.exprs = data;
    this.rounded_exprs = rounded_data;
    this.nofgenes_total = cursum;
    x2nofgenes_under[MIN_X_DOMAIN] = 0;
    x2nofgenes_under[MAX_X_DOMAIN] = cursum;
    this.x2nofgenes = x2nofgenes;
    this.x2nofgenes_under = x2nofgenes_under;
    this.PERC_DIV = this.nofgenes_total / 100;
    this.d3_data = d3_data;
  }

  set_axes() {
    // //////tmpconsole.logg((this.id_name, 'fdsaf')
    this.set_x();
    this.set_xAxis();
    this.set_y();
    this.set_yAxis();
    this.set_tickAxis();
  }

  set_x() {
    this.x = d3
      .scaleLinear()
      .range([0, WIDTH])
      .domain([MIN_X_DOMAIN, MAX_X_DOMAIN]);
  }

  set_xAxis() {
    this.xAxis = d3
      .axisBottom(this.x)
      .tickFormat(d3.format(".2"))
      .tickValues(d3.range(MIN_X_DOMAIN, MAX_X_DOMAIN, X_IV));
  }

  set_tickAxis() {
    this.tickAxis = d3
      .axisBottom(this.x)
      .tickFormat("")
      .tickSize(4)
      .tickValues(d3.range(MIN_X_DOMAIN, MAX_X_DOMAIN, 0.2));
  }

  set_y() {
    this.y = d3.scaleLinear().range([height, 0]);
  }

  set_yAxis() {
    this.yAxis = d3.axisLeft().scale(this.y).tickSizeOuter(1);
  }

  set_line() {
    // //////tmpconsole.logg(('hoi', this);
    var x = this.x;
    var y = this.y;
    var id_name = this.id_name;
    this.line = d3
      .line()
      .curve(d3.curveBasis)
      .x(function (d) {
        return x(d.x_value);
      })
      .y(function (d) {
        return y(d.expr);
      });
  }

  set_area() {
    // id_name = this.id_name;
    var this_x = this.x;
    var this_y = this.y;
    var id_name = this.id_name;
    this.area = d3
      .area()
      .curve(d3.curveBasisOpen)
      .x(function (d) {
        return this_x(d.x_value);
      })
      .y0(height)
      .y1(function (d) {
        return this_y(d.expr);
      });
  }

  set_svg() {
    this.main_svg = d3
      .select(`#expr_${this.id_name}`)
      .attr("width", WIDTH + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  }

  set_brush() {
    if (Object.keys(id_name2default_range).includes(this.id_name)) {
      var default_range = id_name2default_range[this.id_name];
      //tmpconsole.logg("default_range", default_range);
    } else {
      var default_range = [MIN_X_DOMAIN, MAX_X_DOMAIN];
    }
    var this_id_name = this.id_name;
    var this_x = this.x;
    var this_y = this.y;
    var this_main_svg = this.main_svg;
    //  this_data = this.x2nofgenes;
    var this_data = this.d3_data;
    // ////tmpconsole.logg(("THIS IS ACTUAL", this_data);
    var this_area = this.area;
    var this_x2nofgenes = this.x2nofgenes;
    // var this_x2genes = this.x2genes;
    var this_x2nofgenes_under = this.x2nofgenes_under;
    var brushResizePath = function (d) {
      // ////tmpconsole.logg(("called");
      var e = +(d.type == "e");
      var x = e ? 1 : -1;
      var y = height / 3;
      var out =
        "M" +
        0.5 * x +
        "," +
        y +
        "A6,6 0 0 " +
        e +
        " " +
        6.5 * x +
        "," +
        (y + 6) +
        "V" +
        (2 * y - 6) +
        "A6,6 0 0 " +
        e +
        " " +
        0.5 * x +
        "," +
        2 * y +
        "Z" +
        "M" +
        2.5 * x +
        "," +
        (y + 8) +
        "V" +
        (2 * y - 8) +
        "M" +
        4.5 * x +
        "," +
        (y + 8) +
        "V" +
        (2 * y - 8) +
        "M0,0" +
        "l0," +
        height;
      // //////tmpconsole.logg((out);
      return out;
    };
    this.brushResizePath = brushResizePath;
    var this_brushResizePath = this.brushResizePath;
    var this_nofgenes_total = this.nofgenes_total;
    // //tmpconsole.logg("this_nofgenes_total", this_nofgenes_total);
    var this_PERC_DIV = this.PERC_DIV;
    this.brush = d3
      .brushX()
      .extent([
        [0, 0],
        [WIDTH, height],
      ])
      .on("brush", function (d) {
        // change position of handles based on current position
        update_brush_handles(d3.selectAll(`#handle--custom_${this_id_name}`));

        // Get current range and domain selected by brush
        var current_range_selection = d3.brushSelection(this),
          current_domain_selection = prepare_domain_selection(
            current_range_selection.map(this_x.invert)
          );

        // If brush selects up to and incl either left or right boundary,
        // cross out text accordingly
        update_numeric_inputs(
          this_id_name,
          current_domain_selection
          // current_range_selection
        );
        // Select the right subset of the data corresponding to current
        // selection, and feed it to the area so it is displayed
        var start_idx = (current_range_selection[0] / WIDTH) * this_data.length,
          end_idx = (current_range_selection[1] / WIDTH) * this_data.length;
        this_main_svg
          .select(".area")
          .attr("d", this_area(this_data.slice(start_idx, end_idx)));
        // Compute the number of genes currently selected and update the chart
        var nof_genes_selected =
          this_x2nofgenes_under[
            parseFloat(current_domain_selection[1].toFixed(DECIMALS))
          ] -
          this_x2nofgenes_under[
            parseFloat(current_domain_selection[0].toFixed(DECIMALS))
          ];
        if (!isNaN(nof_genes_selected)) {
          d3.select(`#nofgenes_${this_id_name}`).text(nof_genes_selected);
          d3.select(`#percgenes_${this_id_name}`).text(
            ` (${format(nof_genes_selected / this_PERC_DIV)}%)`
          );
        } else {
          console.log(
            current_domain_selection[0].toFixed(DECIMALS),
            current_domain_selection[1].toFixed(DECIMALS),
            this_x2nofgenes_under[
              current_domain_selection[0].toFixed(DECIMALS)
            ],
            this_x2nofgenes_under[current_domain_selection[1].toFixed(DECIMALS)]
          );
        }
        // d3.select(`#nofgenes_${this_id_name}`).text(nof_genes_selected)function () {
        // d3.select(`#percgenes_${this_id_name}`).text(
        //
        // );
        // return nofgenes;
        // });
        // var nofgenes_at_x_min =
        //   this_x2nofgenes_under[round_to_n_decimals(min_x, DECIMALS)];
        // if (isNaN(nofgenes_at_x_min)) {
        //   nofgenes_at_x_min = 0;
        // }
        // var nofgenes_at_x_max =
        //   this_x2nofgenes_under[round_to_n_decimals(max_x, DECIMALS)];
        // if (isNaN(nofgenes_at_x_max)) {
        //   nofgenes_at_x_max = this_nofgenes_total;
        // }
        // var nofgenes = nofgenes_at_x_max - nofgenes_at_x_min;
        // ////tmpconsole.logg((nofgenes, max_x, min_x);
        // if (!isNaN(nofgenes)) {
        //   // Update number of genes selected
        // }
        // //////tmpconsole.logg((d3.selectAll(".handle--custom"));
        // update_brush_handles(d3.selectAll(`.handle--custom-${this_id_name}`));
      })
      .on("end", function () {
        // ////tmpconsole.logg("END", d3.brushSelection(this))
        var curRange = d3.event.selection;
        if (curRange == null) {
          ////tmpconsole.logg('NULL-RANGE')
          // get values from range inputs in case end is range is not defined
          curRange = d3
            .selectAll(`.input_range_${this_id_name}`)
            .nodes()
            .map(function (e) {
              return round(e.value);
            });
          ////tmpconsole.logg(curRange)
          d3.select(`#brush_${this_id_name}`).call(
            this_brush.move,
            curRange.map(this_x)
          );
        }
        update_venn(); //unc later
        // stop_previous_and_update_venn()

        // var current_selection = [];
        // var x_values = this_x.invert(curRange);
        // var min_x_val =
        //   Math.ceil(this_x.invert(curRange[0]) / DATA_IV) * DATA_IV;
        // var max_x_val =
        //   Math.floor(this_x.invert(curRange[1]) / DATA_IV) * DATA_IV;
        // // ////tmpconsole.logg(min_x_val, max_x_val)
        // range(min_x_val, max_x_val, DATA_IV, DECIMALS).forEach(function (
        //   x_val
        // ) {
        // ////tmpconsole.logg(x_val, this_x2genes[x_val]);
        // current_selection = current_selection.concat(this_x2genes[x_val]);
        // Array.prototype.push.apply(current_selection, this_x2nofgenes[x_val]);
        // });
        // var current_selection_set = new Set(current_selection);
        // ACTIVE_ID_NAME2CURRENT_SELECTION[this_id_name] = current_selection_set;
        // var nofgenes = current_selection_set.size;
        // d3.select(`#nofgenes_${this_id_name}`).text(function () {
        //   d3.select(`#percgenes_${this_id_name}`).text(
        //     " (" + format(nofgenes / this_PERC_DIV) + "%)"
        //   );
        //   return nofgenes;
        // });
      });

    var this_brush = this.brush;
    this.brush_node = this.main_svg
      .append("g")
      .attr("class", "brush")
      .attr("id", `brush_${this_id_name}`)
      .call(this_brush);

    // add brush handles
    this.brush_handle = this.brush_node
      .selectAll(".handle--custom")
      .data([
        {
          type: "w",
        },
        {
          type: "e",
        },
      ])
      .enter()
      .append("path")
      .attr("class", "handle--custom")
      .attr("id", `handle--custom_${this_id_name}`)
      // .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("stroke", "#000")
      .attr("cursor", "ew-resize")
      .attr("d", brushResizePath);

    this.brush_node
      .call(this_brush.move, default_range.map(this_x))
      .selectAll(".overlay")
      .on("mousedown touchstart", function () {
        // if click outside of
        // cur sel, re-set current selection to prevent deselection
        d3.event.stopImmediatePropagation();
        d3.select(this.parentNode)
          .transition()
          .call(this_brush.move, d3.brushSelection(this.parentNode));
      });
  }
}

var vennDiv = d3
  .select("#venn")
  .attr("width", vennWidth + vennMargin.left + vennMargin.right)
  .attr("height", vennHeight + vennMargin.bottom, vennMargin.top);

function init_venn() {
  var vennDiv = d3
    .select("#venn")
    .attr("width", vennWidth + vennMargin.left + vennMargin.right)
    .attr("height", vennHeight + vennMargin.bottom, vennMargin.top);
  // vennChart = venn.VennDiagram(subset_name2size);

  // vennDiv.datum(sets).call(vennChart);
  // vennDiv.datum(newsets).call(venn.VennDiagram(subset_name2size))
}
// init_venn();
//tmpconsole.logg("JA");
// var histo_object_checking = add_histo('checking')
// stop_previous_and_update_venn()

jQuery.fn.outerHTML = function (s) {
  return s
    ? this.before(s).remove()
    : jQuery("<p>").append(this.eq(0).clone()).html();
};

// return title text element to be used as title for these id_names and
// tissue_names
function return_title_div(id_name_list, tissue_name_list) {
  var comb_id_names = id_name_list.join("-");
  var title = $("<text/>", {
    "class": "chart_title",
    style: "font-size: 16px;",
  });
  if (id_name_list.length == 1) {
    var tissue_name = tissue_name_list[0];
    title.append(`Max. gene expression in ${tissue_name} (log₂ scale)`);
  } else {
    var select_tissue = $("<select/>", { id: "selected_graph" });
    id_name_list.forEach(function (id_name, ind) {
      var tissue_name = tissue_name_list[ind];
      //tmpconsole.logg("option", id_name, tissue_name);
      select_tissue.append(
        $("<option/>", { value: id_name, text: tissue_name })
      );
    });
    title.append(
      `Max. gene expression in ${select_tissue.outerHTML()} (log₂ scale)`
    );
    //tmpconsole.logg(select_tissue.outerHTML());
  }

  return title;
}

// Given id name list, return a histogram
function add_histo(id_name_list, tissue_name_list) {
  var chartwrapper = $("#chartwrapper");
  var comb_id_names = id_name_list.join("-");
  //tmpconsole.logg(comb_id_names);
  var div_to_append = $("<div />", {
    id: `div_chart_${comb_id_names}`,
    "class": "multi_graph_wrapper",
  });
  div_to_append.append(return_title_div(id_name_list, tissue_name_list));
  id_name_list.forEach(function (id_name, ind) {
    var tissue_name = tissue_name_list[ind];
    var svg_wrapper = $("<div/>", {
      id: `chart_${id_name}`,
      "class": "graph_wrapper",
    });
    // svg_wrapper.append(
    //   `<text x="325" y="-15" text-anchor="middle" style="font-size: 16px;">Max. gene expression in ${tissue_name} (log₂ scale)</text>`
    // );
    svg_wrapper.append(`<svg class="chart" id="expr_${id_name}"></svg>`);
    svg_wrapper.append(`<div class="chart_status"> <p>Selected
              <span class="nofgenes" id="nofgenes_${id_name}">13468</span>
                         <span class="percgenes" id="percgenes_${id_name}">(89.14%)</span> genes whose max. expression in ${tissue_name} is above <input class="input_range_${id_name}" id="input_min_${id_name}" type="number" step="0.01" min="0" max="13">&nbsp;</p><p id="max_range_max_${id_name}">and below <input class="input_range_${id_name}" id="input_max_${id_name}" type="number" step="0.01" min="0" max="13"></p>`);
    div_to_append.append(svg_wrapper);
    var out = new histo(id_name);
    $.getJSON(`data/${id_name}.json`, "").done(function (exprs) {
      //tmpconsole.logg("done");
      out.parse_data(exprs);
      out.set_axes();
      out.set_line();
      out.set_area();
      out.set_svg();
      out.fill();
      out.set_brush();
      out.set_input_range_listener();
    });
    // chartwrapper.append(div_to_append);
    id_name2histo_object[id_name] = out;
  });

  chartwrapper.append(div_to_append);
}
// function add_histo(id_name) {
//   var out = new histo(id_name);
//   // var out;
//   $.getJSON(`data/${id_name}.json`, "").done(function (exprs) {
//     //tmpconsole.logg("done");
//     out.parse_data(exprs);
//     out.set_axes();
//     out.set_line();
//     out.set_area();
//     out.set_input_range_listener();
//     out.set_svg();
//     out.fill();
//     out.set_brush();

//     // out.parse_data(exprs);
//     // out.set_brush();
//     // out.set_line();
//     // out.set_area();
//     // out.set_svg();
//     // out.set_input_range_listener();
//     // out.fill();
//     // out.set_brush();
//   });
//   //   var relevant_range = range(0, MAX_X_DOMAIN, IV, 2);
//   //   // init x2nofgenes mapping
//   //   relevant_range.forEach(function (val) {
//   //     x2nofgenes[val] = 0;
//   //   });
//   //   // fill x2nofgenes mapping
//   //   received_data.forEach(function (val) {
//   //     var rounded_value = round_to_n_decimals(parseFloat(val), DECIMALS);
//   //     // //tmpconsole.logg("rounded_val", rounded_value);
//   //     x2nofgenes[rounded_value] += 1;
//   //   });
//   //   var cursum = 0;
//   //   var x2nofgenes_under = new Object();
//   //   relevant_range.forEach(function (val) {
//   //     cursum += x2nofgenes[val];
//   //     x2nofgenes_under[val] = cursum;
//   //   });
//   //   this.nofgenes_total = cursum;
//   //   this.exprs = received_data;
//   //   //tmpconsole.logg("exprs", this.exprs);
//   //   this.x2nofgenes = x2nofgenes;
//   //   this.x2nofgenes_under = x2nofgenes_under;
//   //   this.PERC_DIV = this.nofgenes_total / 100;
//   //   data = received_data;
//   //   // var tupled_data = []; // make an array of tuples for line data to work on
//   //   // //tmpconsole.logg(x2nofgenes);
//   //   // Object.keys(x2nofgenes)
//   //   //   .sort(function (a, b) {
//   //   //     parseFloat(a) - parseFloat(b);
//   //   //   })
//   //   //   .forEach(function (val) {
//   //   //     tupled_data.push([parseFloat(val), x2nofgenes[val]]);
//   //   //   });
//   //   // //tmpconsole.logg(tupled_data);
//   //   // //tmpconsole.logg(x2nofgenes);
//   // });
//   var chartwrapper = $("#chartwrapper");
//   chartwrapper.append(`<div id="div_chart_${id_name}" class="chart_div">
//           <svg class="chart" id="expr_${id_name}"></svg>
//           <div class="chart_status">
//             <p>Selected
//               <span class="nofgenes" id="nofgenes_${id_name}">13468</span>
//               <span class="percgenes" id="percgenes_${id_name}">(89.14%)</span>

//               genes whose max. expression in tumors is above <input class="input_range_${id_name}" id="input_min_${id_name}" type="number" step="0.01" min="0" max="13">&nbsp;</p><p id="max_range_max_${id_name}">and below <input class="input_range_${id_name}" id="input_max_${id_name}" type="number" step="0.01" min="0" max="13"></p>
//           </div>
//         </div>`);
//   // CHARTS_to_be_made.push(id_name)

//   id_name2histo_object[id_name] = out;
//   // CHARTS.push(out)
//   return out;
// }

// sets is is an array with objects, each object has a sets and size attribute
// see example:
// const subset_name2size = {'a' : 2, // size of 'a' circle
//                         'b': 2, // size of 'b' cirlce
//                         'a,b': 1, // size of a AND b intersection circle
//                        }
// var sets = [
//     // Variable
//     {sets: ['a'], size: 2},
//     {sets: ['b'], size: 2},
//     {sets: [['a'],['b']], size: 1},
// ]

// uses global CHARTS variable to determine relevant set info
function getCombinations(array) {
  var result = [];
  var f = function (prefix = [], array) {
    for (var i = 0; i < array.length; i++) {
      result.push([...prefix, array[i]]);
      f([...prefix, array[i]], array.slice(i + 1));
    }
  };
  f([], array);
  return result;
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function set_intersection_arbitrary(sets) {
  // ////tmpconsole.logg(sets);
  var smallest_set = sets.reduce(function (s0, s1) {
    if (s0.size < s1.size) {
      return s0;
    } else {
      return s1;
    }
  });
  return new Set(
    [...smallest_set].filter(function (x) {
      for (var i = 0; i < sets.length; ++i) {
        if (sets[i].has(x)) {
          continue;
        } else {
          return false;
        }
      }
      return true;
    })
  );
}

function set_intersection_binary(A, B) {
  return new Set([...A].filter((x) => B.has(x)));
}

function get_set_info() {
  var id_names = Object.keys(ACTIVE_ID_NAME2CURRENT_SELECTION);
  if (id_names.length == 0) {
    return;
  }
  var set_combinations = getCombinations(id_names);
  ////tmpconsole.logg(set_combinations)
  previous_comb = set_combinations[0];
  previous_intersection = ACTIVE_ID_NAME2CURRENT_SELECTION[previous_comb[0]]; // assuming first combination is always singleton
  var sets = new Array();
  var subset_name2size = new Object();
  ////tmpconsole.logg(previous_intersection)
  // var previous_intersection = new Set;
  var new_intersection;
  for (var i = 0; i < set_combinations.length; ++i) {
    var this_comb = set_combinations[i];
    ////tmpconsole.logg(i, this_comb)
    if (arraysEqual(this_comb.slice(0, previous_comb.length), previous_comb)) {
      ////tmpconsole.logg('this route')
      var new_id_name = this_comb[this_comb.length - 1];
      var new_set = ACTIVE_ID_NAME2CURRENT_SELECTION[new_id_name];
      new_intersection = set_intersection_binary(
        previous_intersection,
        new_set
      );
    } else {
      var sets_this_comb = this_comb.map(function (id_name) {
        return ACTIVE_ID_NAME2CURRENT_SELECTION[id_name];
      });
      new_intersection = set_intersection_arbitrary(sets_this_comb);
    }
    ////tmpconsole.logg(this_comb.join(','))
    ////tmpconsole.logg('new intersection', new_intersection)
    subset_name2size[this_comb.join(",")] = new_intersection.size;
    sets.push({ size: new_intersection.size, sets: this_comb });
    previous_comb = this_comb;
    previous_intersectoin = new_intersection;
  }
  ////tmpconsole.logg(subset_name2size, sets)
  return [subset_name2size, sets];
}

// window.sessionStorage.setItem('checkConds', '1.6,13--0,1.8--6.2,13');
// PERC_DIV = 15064/100
// //Fix empty selection upon
// IV = 0.01;
// MAX_X_RANGE = 650;
// MAX_X_DOMAIN = 13;
// DATA_IV = 0.2;
// X_IV = 0.4;

// vennMargin = {top: 30, bottom: 0, left: 30, right: 30}
// var vennWidth = 1000 - vennMargin.left - vennMargin.right,
//     vennHeight = 1000 - vennMargin.top - vennMargin.bottom;
setAbbrevs = {};
setAbbrevs["1"] = ["Bruggeman et al."];
setAbbrevs["2"] = ["CT database (n = 255)"];
setAbbrevs["3"] = ["CT genes\nWang et al. (n = 1019)"];
setAbbrevs["4"] = [setAbbrevs["1"], setAbbrevs["2"]];
setAbbrevs["5"] = [setAbbrevs["2"], setAbbrevs["3"]];
setAbbrevs["6"] = [setAbbrevs["3"], setAbbrevs["1"]];
setAbbrevs["7"] = [setAbbrevs["1"], setAbbrevs["2"], setAbbrevs["3"]];
setSize = {};
// Default setsize
setSize["1"] = 756;
setSize["4"] = 25;
setSize["6"] = 123;
setSize["7"] = 22;

// Update name of bruggeman circle with variable (n= x)
setAbbrevs["1"][0] = setAbbrevs["1"][0] + " (n = " + setSize["1"] + ")";
var array_of_set_size = [
  // Variable
  { sets: setAbbrevs["1"], size: setSize["1"] },
  { sets: setAbbrevs["4"], size: setSize["4"] },
  { sets: setAbbrevs["6"], size: setSize["6"] },
  { sets: setAbbrevs["7"], size: setSize["7"] },

  // Fixed size
  { sets: setAbbrevs["2"], size: 255 },
  { sets: setAbbrevs["3"], size: 1019 },
  { sets: setAbbrevs["5"], size: 146 },
];
// vennMargin = {top: 30, bottom: 0, left: 30, right: 30}
// var vennWidth = 1000 - vennMargin.left - vennMargin.right,
//     vennHeight = 1000 - vennMargin.top - vennMargin.bottom;

var sn1 = setAbbrevs["1"].join(","),
  sn2 = setAbbrevs["2"].join(","),
  sn3 = setAbbrevs["3"].join(","),
  sn4 = setAbbrevs["4"].join(","),
  sn5 = setAbbrevs["5"].join(","),
  sn6 = setAbbrevs["6"].join(","),
  sn7 = setAbbrevs["7"].join(",");

var subset_name2size = {
  [sn1]: setSize["1"],
  [sn4]: setSize["4"] - setSize["7"],
  [sn6]: setSize["6"] - setSize["7"],
  [sn7]: setSize["7"],

  [sn2]: 255,
  [sn3]: 1019,
  [sn5]: 146 - setSize["7"],
};

var vennDiv = d3
  .select("#venn")
  .attr("width", vennWidth + vennMargin.left + vennMargin.right)
  .attr("height", vennHeight + vennMargin.bottom, vennMargin.top);

// vennChart = venn.VennDiagram(subset_name2size);
// vennDiv.datum(array_of_set_size).call(vennChart);

// add a tooltip

// get selected range for given id_name
function get_selected_range(id_name) {
  try {
    var histo_object = id_name2histo_object[id_name];
    return filter_range(
      d3
        .brushSelection(histo_object["brush_node"].node())
        .map(histo_object.x.invert)
        .map(round)
    );
  } catch (ReferenceError) {
    return false;
  }
}

// function get_or_retrieve_range(id_name) {
//   try {
//     id_name = "tcga";
//     histo_object = id_name2histo_object[id_name];
//     return filter_range(
//       d3
//         .brushSelection(histo_object.brush_node.node())
//         .map(histo_object.x.invert)
//         .map(round)
//     );
//     //tmpconsole.logg(vals);
//     // d3.brushSelection(d3.select("brush_id").node());
//     // var vals = filter_range(d3.brushSelection(
//     //     d3.select(brush_id).node()).map(
//     //         x.invert));
//   } catch (ReferenceError) {
//     // In case current brush seleciton = 0
//     // XXXX
//     //   //tmpconsole.logg("HEREXX");
//     //   prev_conds = window.sessionStorage.getItem("checkConds").split("--");
//     //   // Take comma-separated range that was most recently registered
//     //   if (id_name.endsWith("jan")) {
//     //     var str_vals = prev_conds[0];
//     //   } else if (id_name.endsWith("gtex")) {
//     //     var str_vals = prev_conds[1];
//     //   } else if (id_name.endsWith("tcga")) {
//     //     var str_vals = prev_conds[2];
//     //   }
//     //   // Convert to list with two numbers
//     //   var vals = str_vals.split(",").map(function (x) {
//     //     return round(+x);
//     //   });
//     // }
//     // // Set ranges correctly to prevent out-of-range values to be registered
//     // // //tmpconsole.logg(vals);
//     // vals = filter_range(vals);
//     // return vals.join(",");
//   }
// }

// function ()
//get id names for those graphs that are visible
function get_visible_id_names() {
  var out = [];
  $(".multi_graph_wrapper").each(function () {
    var nof_graphs = $(this).children(".graph_wrapper").length;
    if (nof_graphs == 1) {
      var id_comps = this["id"].split("_");
      var id_name = id_comps[id_comps.length - 1];
      out.push(id_name);
    } else {
      var visible_id_name = $(this)
        .find("#selected_graph")
        .find("option:selected")
        .attr("value");
      out.push(visible_id_name);
    }
  });
  return out;
}

function get_masks() {
  out = new Object();
  var active_graph_id_names = get_visible_id_names();
  active_graph_id_names.forEach(function (name) {
    var mask = [];
    var histo_obj = id_name2histo_object[name];
    var selected_range = get_selected_range(name);
    //tmpconsole.logg(selected_range);
    if (selected_range != false) {
      histo_obj.rounded_exprs.forEach(function (expr) {
        if ((selected_range[0] <= expr) & (expr <= selected_range[1])) {
          mask.push(1);
        } else {
          mask.push(0);
        }
      });
      out[name] = mask;
    } else {
      return false;
    }
  });
  return out;
}
d3.select("#saveVenn").on("click", function () {
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth() + 1;
  var yyyy = today.getFullYear();
  var hh = today.getHours();
  var mi = today.getMinutes();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  if (hh < 10) {
    hh = "0" + hh;
  }
  if (mi < 10) {
    mi = "0" + mi;
  }

  var stamp = yyyy + "_" + mm + "_" + dd + "_" + hh + ":" + mi;

  var svgs = document.querySelector("#venn svg");

  var svgData = new XMLSerializer().serializeToString(svgs);

  var canvas = document.createElement("canvas");

  canvas.width = 900; //d3.select("#venn").attr("width");
  canvas.height = 900; //d3.select("#venn").attr("height");

  var ctx = canvas.getContext("2d");

  var img = document.createElement("img");

  img.setAttribute("src", "data:image/svg+xml;base64," + btoa(svgData));

  img.onload = function () {
    // window.open(img.src.replace('data:application/octet-stream'));
    // window.href = canvas.toDataURL( "image/png" );
    ctx.drawImage(img, 0, 0);

    var link = document.createElement("a");
    link.download = "Bruggeman_Venn_" + stamp;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;

    // Now is done
  };
});

function update_venn() {
  // return;
  //tmpconsole.logg("HUH");
  var inters_idxs = get_intersection_idxs();
  if (inters_idxs == false) {
    return;
  }
  var circle_id2bool_idxs = {
    ...{ current_selection: inters_idxs },
    ...other_db2bool_idxs,
  };
  //tmpconsole.logg("circle_id2bool_idxs", circle_id2bool_idxs);
  var circle_ids = Object.keys(circle_id2bool_idxs);
  console.log(circle_ids);
  //tmpconsole.logg(circle_ids);
  //tmpconsole.logg(circle_ids[0]);
  //tmpconsole.logg(circle_ids[1]);
  //tmpconsole.logg(circle_ids[2]);
  var rows = [];
  var new_array_set_sizes = [];
  var combs = [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]];
  var subset_name2size = {};
  combs.forEach(function (idxs) {
    //tmpconsole.logg(idxs);
    var first_circle_id = circle_ids[idxs[0]];
    //tmpconsole.logg("BEGIN", first_circle_id);
    var all_true = circle_id2bool_idxs[first_circle_id].slice();
    //tmpconsole.logg(all_true);
    // if ((first_circle_id == "current_selection") & (idxs.length == 1)) {
    //   // console.log("HERE");
    //   circle_id2fancy_name[first_circle_id] = [
    //     [`Current selection (n=${math.sum(all_true)})`],
    //   ];
    // }
    // var set_abbrev
    // } else {
    var set_abbrev = [[circle_id2fancy_name[first_circle_id]]];
    // }
    // set_abbrev.push([]);
    //tmpconsole.logg("set abbrev", set_abbrev);
    idxs.slice(1).forEach(function (row_idx) {
      var circle_id = circle_ids[row_idx],
        other_mask = circle_id2bool_idxs[circle_id];
      set_abbrev.push([circle_id2fancy_name[circle_id]]);
      //tmpconsole.logg(set_abbrev);
      other_mask.map(function (el, i) {
        all_true[i] = math.min(el, all_true[i]);
      });
    });
    //tmpconsole.logg("END", set_abbrev);
    var subset_size = math.sum(all_true);
    subset_name2size[set_abbrev] = subset_size;
    new_array_set_sizes.push({ sets: set_abbrev, size: subset_size });
  });
  console.log(
    JSON.stringify(new_array_set_sizes),
    JSON.stringify(subset_name2size)
  );
  // vennDiv.datum(new_array_set_sizes).call(vennChart);
  // vennChart = venn.VennDiagram(subset_name2size);
  // vennDiv = d3.select("#venn");
  // var vd = vennDiv
  vennDiv.datum(new_array_set_sizes).call(venn.VennDiagram(subset_name2size));
  // vd.call();
  // vennDiv.datum(new_array_set_sizes).call(vennChart);
  add_tooltips();
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

// //tmpconsole.logg(masks);
// if (!masks) {
//   //tmpconsole.logg("stop", masks);
//   return;
// }
// // Check if all charts have been loaded, if not, dont draw venn yet
// if (d3.selectAll(".brush").nodes().length < 3) {
//   return;
// }
// var vals_jan = get_or_retrieve_range("jan"),
//   vals_gte = get_or_retrieve_range("gte"),
//   vals_tcgan = get_or_retrieve_range("tcga");
// var checkConds = vals_jan + "--" + vals_gte + "--" + vals_tcgan;
// //tmpconsole.logg("NEE");
// if (window.sessionStorage.getItem("checkConds") == checkConds) {
//   // Means nothing has changed, probably due to reset button being pressed
//   return;
// } else {
//   window.sessionStorage.setItem("checkConds", checkConds);
// }
// //tmpconsole.logg("GAEN ERVOR");
// //tmpconsole.logg("THIS IS DATA", data);
// $.ajax({
//   method: "GET",
//   url: "requests/?conds=" + checkConds,
//   async: true,
//   success: function (data) {
//     // Recieve data in order of set size 1, 4, 6, 7
//     set_sizes = JSON.parse(data);
//     // Replace (n=x) expression for bruggeman genes
//     // setAbbrevs['1'] = ["Current selection\nBruggeman et al." +
//     //		   ];
//     if (checkConds == "1.6,13--0,1.8--6.2,13") {
//       setAbbrevs["1"][0] = setAbbrevs["1"][0].replace(
//         setAbbrevs["1"][0].slice(0, setAbbrevs["1"][0].indexOf("(")),
//         "Bruggeman et al. "
//       );
//     } else if (setAbbrevs["1"][0].includes("Bruggeman")) {
//       setAbbrevs["1"][0] = setAbbrevs["1"][0].replace(
//         setAbbrevs["1"][0].slice(0, setAbbrevs["1"][0].indexOf("(")),
//         "Current selection "
//       );
//     }

//     setAbbrevs["1"][0] = setAbbrevs["1"][0].replace(
//       setAbbrevs["1"][0].slice(setAbbrevs["1"][0].indexOf("(")),
//       "(n = " + set_sizes[0] + ")"
//     );
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

//     var subset_name2size = {
//       [setAbbrevs["1"].join(",")]: set_sizes[0],
//       [setAbbrevs["4"].join(",")]: set_sizes[1] - set_sizes[3],
//       [setAbbrevs["6"].join(",")]: set_sizes[2] - set_sizes[3],
//       [setAbbrevs["7"].join(",")]: set_sizes[3],

//       [setAbbrevs["5"].join(",")]: 146 - set_sizes[3],
//     };

//     vennDiv.datum(new_array_set_sizes).call(venn.VennDiagram(subset_name2size));
//   },
// })
// }

// function update_venn() {
//     if (CHARTS_to_be_made.length != CHARTS.length){
//         ////tmpconsole.logg('not updaing yet')
//         return;
//     };
//     var sets_data = get_set_info(CHARTS);
//     ////tmpconsole.logg(sets_data)
//     if (sets_data == null) {
//         return
//     }

//     var subset_name2size =  sets_data[0], sets = sets_data[1];
//     vennChart = venn.VennDiagram(subset_name2size);
//     vennDiv.datum(sets).call(vennChart);

//     // vennDiv.datum(new_array_set_sizes).call(venn.VennDiagram(subset_name2size))
// }
// var timeout = setTimeout(update_venn, 1000);
// function stop_previous_and_update_venn() {
//     clearTimeout(timeout);
//     //tmpconsole.logg("CLEARING")
//     update_venn();
// }

//     d3.select("#brush_jan").call(brush_jan.move,
//                                  [1.6, MAX_X_DOMAIN].map(x));
//     d3.select("#brush_gte").call(brush_gte.move, [0, 1.8].map(x));
//     d3.select("#brush_tcgan").call(brush_tcgan.move, [6.2, MAX_X_DOMAIN].map(x));
// })

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// get array with 0/1 at locations where the correspoding gene is in all 3 subsets
function get_intersection_idxs() {
  var masks = get_masks();
  if (Object.keys(masks).length != 3) {
    return false;
  }
  var out = [],
    arr0 = Object.values(masks)[0],
    arr1 = Object.values(masks)[1],
    arr2 = Object.values(masks)[2];
  arr0.forEach(function (el, ind) {
    // //tmpconsole.logg([arr0[ind], arr1[ind], arr2[ind]]);
    // //tmpconsole.logg(Math.min(arr0[ind], arr1[ind], arr2[ind]));
    out.push(Math.min(arr0[ind], arr1[ind], arr2[ind]));
  });
  return out;
}
var tooltip = d3
  .select("#bodywrapper")
  .append("div")
  .attr("class", "venntooltip");

function add_tooltips() {
  // add listeners to all the groups to display tooltip on mouseover
  vennDiv = d3.select("#venn");
  vennDiv
    .selectAll("g")
    .on("mouseover", function (d, i) {
      // sort all the areas relative to the current item
      venn.sortAreas(vennDiv, d);

      // Display a tooltip with the current size
      tooltip.transition().duration(400).style("opacity", 0.9);
      tooltip.text(d.size + " genes");

      // highlight the current path
      var selection = d3.select(this).transition("tooltip").duration(400);
      selection
        .select("path")
        .style("stroke-width", 3)
        .style("fill-opacity", d.sets.length == 1 ? 0.4 : 0.1)
        .style("stroke-opacity", 1);
    })

    .on("mousemove", function () {
      // Insert mult with 1.5 cause everything is
      // scaled
      tooltip
        .style("left", 1.5 * d3.event.pageX + "px")
        .style("top", 1.5 * (d3.event.pageY - 28) + "px");
    })

    .on("mouseout", function (d, i) {
      tooltip.transition().duration(400).style("opacity", 0);
      var selection = d3.select(this).transition("tooltip").duration(400);
      selection
        .select("path")
        .style("stroke-width", 0)
        .style("fill-opacity", d.sets.length == 1 ? 0.25 : 0.0)
        .style("stroke-opacity", 0);
    });
}

var circle_id2fancy_name = {};
$(document).ready(function () {
  $.getJSON(`data/CT.json`, "").done(function (data) {
    other_db2bool_idxs["CT"] = data;
    circle_id2fancy_name["CT"] = `CT database (n=${math.sum(
      other_db2bool_idxs["CT"]
    )})`;
  });
  $.getJSON(`data/brug2017.json`, "").done(function (data) {
    other_db2bool_idxs["brug2017"] = data;
    circle_id2fancy_name["brug2017"] = `Bruggeman et al. 2017 (n=${math.sum(
      other_db2bool_idxs["brug2017"]
    )})`;
  });
  circle_id2fancy_name["current_selection"] = "Current Selection";
  init_venn();
  var histo_object_checking = add_histo(
    ["hpgc", "pgclc"],
    ["Human PGCs", "PGC-like cell"]
  );
  var histo_object_checking = add_histo(["tcga"], ["tumors"]);
  var histo_object_gtex = add_histo(["gtex"], ["somatic tissues"]);
  // var histo_object_a = add_histo(["A"], ["A"]);
  // var histo_object_b = add_histo(["B"], ["B"]);
  // var histo_object_c = add_histo(["C"], ["C"]);
  $("#selected_graph")
    .on("change", function () {
      // var all_vals =
      $(this)
        .children()
        .each(function () {
          //tmpconsole.logg(this["value"]);
          if (this["selected"]) {
            $(`#chart_${this["value"]}`).show();
          } else {
            $(`#chart_${this["value"]}`).hide();
          }
        });
      update_venn();
    })
    .trigger("change");
  $("#downloadCurSel").click(function () {
    var idxs = get_intersection_idxs();
    if (idxs == false) {
      return;
    }
    $.ajax({
      method: "post",
      async: false,
      url: "download",
      data: {
        idxs: idxs.join(""),
      },
      async: true,
      success: function (data) {
        download("check.csv", data);
        // window.location = "download/";
      },
    });
  });

  d3.select("#reset_original").on("click", function () {
    Object.keys(id_name2histo_object).forEach(function (id_name) {
      //tmpconsole.logg(id_name);
      var histo_object = id_name2histo_object[id_name];
      //tmpconsole.logg(id_name2default_range[id_name].map(histo_object.x));
      var default_range = id_name2default_range[id_name];
      d3.select(`#brush_${id_name}`).call(
        histo_object["brush"].move,
        default_range.map(histo_object["x"]).sort(function (a, b) {
          return a - b;
        })
      );
    });
  });
});
