
// Global variables
var mortgageCounter = 0;
var mortgages = []; // Array to store all mortgage data
var allPlots = []; // Store all plot instances for synchronized tooltips

var options1 = {
  series: {
      shadowSize : 0
        },
  xaxis: {
      rotateTicks : 90,
      mode: "time",
      timeformat: "%Y-%m",
      tickSize: [3, 'month'],
      tickLength: 10,
      color: "black",
      axisLabel: "Date",
      axisLabelUseCanvas: true,
      axisLabelFontSizePixels: 2,
      axisLabelFontFamily: 'Verdana, Arial',
      axisLabelPadding:2
  },

  yaxes: [{
      position: "left",
      color: "black",
      axisLabel: "$ Interest/$ Principal",
      axisLabelUseCanvas: true,
      axisLabelFontSizePixels: 12,
      axisLabelFontFamily: 'Verdana, Arial',
      axisLabelPadding: 3
  }, {
      position: "right",
      color: "black",
      axisLabel: "$ Owing",
      axisLabelUseCanvas: true,
      axisLabelFontSizePixels: 12,
      axisLabelFontFamily: 'Verdana, Arial',
      axisLabelPadding: 3
  }],

  grid: {
      hoverable: true,
      borderWidth: 2,
      backgroundColor: { colors: ["#EDF5FF", "#ffffff"] }
  },
  colors:["#004078","#207800", "#613C00"]
};

// Color schemes for different mortgages
var colorSchemes = [
  { interest: "#0077FF", principal: "#7D0096", owing: "#004078" },
  { interest: "#FF6B35", principal: "#F7931E", owing: "#C1292E" },
  { interest: "#4ECDC4", principal: "#44A08D", owing: "#006D77" },
  { interest: "#9B59B6", principal: "#8E44AD", owing: "#6C3483" },
  { interest: "#16A085", principal: "#1ABC9C", owing: "#0E6655" }
];

$(document).ready(function () {
  // Add first mortgage form on load
  addMortgageForm();
});

var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function gd(year, month, day) {
    return new Date(year, month - 1, day).getTime();
}

// Calculate required payment to payoff by a specific date
function calculateRequiredPayment(principal, rate, frequency, targetYear, targetMonth) {
  var d = new Date();
  var currentYear = d.getFullYear();
  var currentMonth = d.getMonth() + 1;

  // Calculate total days until payoff
  var totalDays = 0;
  for (var y = currentYear; y <= targetYear; y++) {
    var startMonth = (y === currentYear) ? currentMonth : 1;
    var endMonth = (y === targetYear) ? targetMonth : 12;

    for (var m = startMonth; m <= endMonth; m++) {
      totalDays += days_in_mth(m, y);
    }
  }

  // Calculate number of payments
  var numPayments = Math.floor(totalDays / frequency);

  if (numPayments <= 0) {
    return -1; // Invalid
  }

  // Use binary search to find the right payment amount
  var minPayment = 0;
  var maxPayment = principal * 2; // Upper bound
  var tolerance = 0.01;
  var iterations = 0;
  var maxIterations = 100;

  while (iterations < maxIterations && (maxPayment - minPayment) > tolerance) {
    var testPayment = (minPayment + maxPayment) / 2;

    // Simulate the mortgage with this payment
    var testPrincipal = principal;
    var days = 0;

    for (var y = currentYear; y <= targetYear && testPrincipal > 0; y++) {
      var startMonth = (y === currentYear) ? currentMonth : 1;
      var endMonth = (y === targetYear) ? targetMonth : 12;

      for (var m = startMonth; m <= endMonth && testPrincipal > 0; m++) {
        var daysmth = days_in_mth(m, y);

        for (var i = 1; i <= daysmth && testPrincipal > 0; i++) {
          days++;
          var interest = calc_daily_interest(testPrincipal, rate, y);
          testPrincipal += interest;

          if (days % frequency === 0) {
            testPrincipal -= testPayment;
          }
        }
      }
    }

    // Adjust search range
    if (testPrincipal > 0) {
      minPayment = testPayment; // Payment too low
    } else {
      maxPayment = testPayment; // Payment too high
    }

    iterations++;
  }

  return (minPayment + maxPayment) / 2;
}

// Add a new mortgage input form
function addMortgageForm() {
  mortgageCounter++;
  var formHtml = `
    <div class="mortgage-form" id="mortgage-form-${mortgageCounter}">
      <strong>Mortgage #${mortgageCounter}</strong>
      <input type="text" id="name-${mortgageCounter}" placeholder="Name (e.g., Option A)" value="Mortgage ${mortgageCounter}">
      <input type="number" id="principal-${mortgageCounter}" placeholder="Loan Amount $..." value="">
      <input type="number" step="0.01" id="rate-${mortgageCounter}" placeholder="Interest Rate %..." value="">

      <div class="payment-mode-selector">
        <label>
          <input type="radio" name="paymentMode-${mortgageCounter}" value="amount" checked onchange="togglePaymentFields(${mortgageCounter})">
          Specify Payment Amount & Frequency
        </label>
        <label>
          <input type="radio" name="paymentMode-${mortgageCounter}" value="date" onchange="togglePaymentFields(${mortgageCounter})">
          Specify Payoff Date
        </label>
      </div>

      <div class="payment-fields" id="payment-amount-fields-${mortgageCounter}">
        <input type="number" id="payment-${mortgageCounter}" placeholder="Payment Amount $..." value="">
        <input type="number" id="frequency-${mortgageCounter}" placeholder="Payment Frequency (days)..." value="30">
      </div>

      <div class="payment-fields hidden" id="payoff-date-fields-${mortgageCounter}">
        <input type="number" id="payoff-year-${mortgageCounter}" placeholder="Payoff Year (e.g., 2040)" value="">
        <input type="number" id="payoff-month-${mortgageCounter}" placeholder="Payoff Month (1-12)" value="" min="1" max="12">
        <input type="number" id="frequency-calc-${mortgageCounter}" placeholder="Payment Frequency (days)..." value="30">
      </div>

      <button onclick="removeMortgageForm(${mortgageCounter})">Remove</button>
    </div>
  `;
  $("#mortgages-container").append(formHtml);
}

// Toggle between payment amount and payoff date fields
function togglePaymentFields(id) {
  var mode = $("input[name='paymentMode-" + id + "']:checked").val();
  if (mode === "amount") {
    $("#payment-amount-fields-" + id).removeClass("hidden");
    $("#payoff-date-fields-" + id).addClass("hidden");
  } else {
    $("#payment-amount-fields-" + id).addClass("hidden");
    $("#payoff-date-fields-" + id).removeClass("hidden");
  }
}

// Remove a mortgage form
function removeMortgageForm(id) {
  $("#mortgage-form-" + id).remove();
}

// Calculate all mortgages and display
function calculateAll() {
  mortgages = [];
  var forms = $(".mortgage-form");

  if (forms.length === 0) {
    alert("Please add at least one mortgage");
    return;
  }

  forms.each(function() {
    var id = $(this).attr('id').split('-')[2];
    var name = $("#name-" + id).val() || "Mortgage " + id;
    var principal = parseFloat($("#principal-" + id).val());
    var rate = parseFloat($("#rate-" + id).val());

    var paymentMode = $("input[name='paymentMode-" + id + "']:checked").val();
    var payment, frequency;

    if (paymentMode === "amount") {
      // User specified payment amount and frequency
      payment = parseFloat($("#payment-" + id).val());
      frequency = parseFloat($("#frequency-" + id).val());

      if (principal > 0 && rate > 0 && payment > 0 && frequency > 0) {
        var mortgageData = calculateMortgage(principal, rate, payment, frequency, name, mortgages.length);
        mortgages.push(mortgageData);
      }
    } else {
      // User specified payoff date - calculate required payment
      var payoffYear = parseInt($("#payoff-year-" + id).val());
      var payoffMonth = parseInt($("#payoff-month-" + id).val());
      frequency = parseFloat($("#frequency-calc-" + id).val());

      if (principal > 0 && rate > 0 && payoffYear > 0 && payoffMonth > 0 && payoffMonth <= 12 && frequency > 0) {
        // Calculate required payment
        payment = calculateRequiredPayment(principal, rate, frequency, payoffYear, payoffMonth);
        if (payment > 0) {
          var mortgageData = calculateMortgage(principal, rate, payment, frequency, name, mortgages.length);
          mortgageData.calculatedPayment = true;
          mortgages.push(mortgageData);
        } else {
          alert("Could not calculate payment for " + name + ". The payoff date may be too soon.");
        }
      }
    }
  });

  if (mortgages.length === 0) {
    alert("Please enter valid data for at least one mortgage");
    return;
  }

  var displayMode = $("input[name='displayMode']:checked").val();
  if (displayMode === "overlay") {
    displayOverlay();
  } else {
    displaySideBySide();
  }

  // Add summary graph if checkbox is checked
  if ($("#showSummaryGraph").is(":checked")) {
    displaySummaryGraph();
  }
}

// Calculate mortgage data
function calculateMortgage(principal, rate, payment, frequency, name, index) {
  var data1 = []; // Monthly interest
  var data2 = []; // Monthly principal
  var owing = []; // Amount owing

  var d = new Date();
  var year = d.getFullYear();
  var mnth = d.getMonth() + 1;

  var days = 0;
  var gprincipal = principal;
  var int_accum = 0;
  var final_year = 0;
  var final_month = 0;

  for (var y = year; y <= year + 40; y++) {
    for (var i = mnth; i <= 12; i++) {
      if (i == 12)
        mnth = 1;

      var result = calc_monthly_int(i, y, rate, frequency, payment, days, gprincipal, int_accum, data1, data2, owing);
      days = result.days;
      gprincipal = result.gprincipal;
      int_accum = result.int_accum;

      if (result.finished) {
        break;
      } else {
        final_year = y;
        final_month = i;
      }
    }
    if (gprincipal <= 0) break;
  }

  var colorScheme = colorSchemes[index % colorSchemes.length];

  return {
    name: name,
    principal: principal,
    rate: rate,
    payment: payment,
    frequency: frequency,
    data1: data1,
    data2: data2,
    owing: owing,
    totalInterest: int_accum,
    finalYear: final_year,
    finalMonth: final_month,
    colorScheme: colorScheme,
    startYear: year,
    startMonth: monthNames[mnth - 1]
  };
}

function calc_daily_interest(principal, yearly_int_rate, year) {
  var days0;
  if (year % 4 == 0)
    days0 = 366;
  else
    days0 = 365;
  var a = (((yearly_int_rate / 100) / days0) * principal);
  return a;
}

function days_in_mth(m, y) {
  if (m <= 7) {
    if (m % 2 == 1)
      return 31;
    else if (m != 2)
      return 30;
    else if (y % 4 == 0)
      return 29;
    else
      return 28;
  } else {
    if (m % 2 == 0)
      return 31;
    else
      return 30;
  }
}

function calc_monthly_int(mth, year, int_rate, payment_freq, pymt, days, gprincipal, int_accum, data1, data2, owing) {
  var i;
  var interest;
  var mth_int = 0;
  var daysmth = days_in_mth(mth, year);
  var paid_this_month = 0;

  if (gprincipal <= 0) {
    return { finished: true, days: days, gprincipal: gprincipal, int_accum: int_accum };
  }

  for (i = 1; i <= daysmth; i++) {
    days++;
    interest = calc_daily_interest(gprincipal, int_rate, year);
    gprincipal += interest;
    int_accum += interest;
    mth_int += interest;

    if (days % payment_freq == 0) {
      gprincipal -= pymt;
      paid_this_month += pymt;
    }

    if (gprincipal <= 0) {
      change = -gprincipal;
      gprincipal = 0;
    }
  }

  data1.push([gd(year, mth, 1), mth_int]);
  data2.push([gd(year, mth, 1), paid_this_month - mth_int]);
  owing.push([gd(year, mth, 1), gprincipal]);

  return { finished: false, days: days, gprincipal: gprincipal, int_accum: int_accum };
}

// Display all mortgages overlaid on one graph
function displayOverlay() {
  $("#graphs-container").empty();
  $("body").removeClass("side-by-side-mode").addClass("overlay-mode");

  var graphHtml = `
    <div class="graph-panel">
      <div class="graph-title">Mortgage Comparison - All Mortgages Overlaid</div>
      <div id="graph-overlay" style="width:1350px;height:900px;margin:0 auto"></div>
    </div>
  `;
  $("#graphs-container").append(graphHtml);

  var dataset = [];

  // Add all mortgage data to one dataset
  mortgages.forEach(function(mortgage, index) {
    var colors = mortgage.colorScheme;

    dataset.push({
      label: mortgage.name + " - Interest",
      data: mortgage.data1,
      color: colors.interest,
      stack: "stack" + index,
      bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30 / (mortgages.length + 1), lineWidth: 1 }
    });

    dataset.push({
      label: mortgage.name + " - Principal",
      data: mortgage.data2,
      color: colors.principal,
      stack: "stack" + index,
      bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30 / (mortgages.length + 1), lineWidth: 1 }
    });

    dataset.push({
      label: mortgage.name + " - Owing",
      data: mortgage.owing,
      color: colors.owing,
      yaxis: 2,
      stack: false,
      lines: { show: true, lineWidth: 2, fill: false }
    });
  });

  var plot = $.plot($("#graph-overlay"), dataset, options1);
  setupTooltip($("#graph-overlay"), mortgages);

  // Add mortgage info below graph
  var infoHtml = '<div style="margin-top: 20px;">';
  mortgages.forEach(function(mortgage) {
    var paymentInfo = mortgage.calculatedPayment
      ? `Payment $${mortgage.payment.toFixed(2).toLocaleString()} (calculated) every ${mortgage.frequency} days`
      : `Payment $${mortgage.payment.toLocaleString()} every ${mortgage.frequency} days`;

    infoHtml += `<div class="graph-info" style="color: ${mortgage.colorScheme.owing}">
      <strong>${mortgage.name}:</strong>
      Loan $${mortgage.principal.toLocaleString()} at ${mortgage.rate}% |
      ${paymentInfo} |
      Total Interest: $${mortgage.totalInterest.toFixed(2).toLocaleString()} |
      Payoff: ${mortgage.finalYear}-${mortgage.finalMonth}
    </div>`;
  });
  infoHtml += '</div>';
  $("#graphs-container").append(infoHtml);
}

// Display mortgages stacked vertically
function displaySideBySide() {
  $("#graphs-container").empty();
  allPlots = [];

  mortgages.forEach(function(mortgage, index) {
    var graphId = "graph-" + index;
    var paymentInfo = mortgage.calculatedPayment
      ? `$${mortgage.payment.toFixed(2).toLocaleString()} (calculated)`
      : `$${mortgage.payment.toLocaleString()}`;

    var graphHtml = `
      <div class="graph-panel">
        <div class="graph-title">${mortgage.name}</div>
        <div class="graph-info">
          Loan: $${mortgage.principal.toLocaleString()} |
          Rate: ${mortgage.rate}% |
          Payment: ${paymentInfo} every ${mortgage.frequency} days<br>
          Total Interest: $${mortgage.totalInterest.toFixed(2).toLocaleString()} |
          Payoff Date: ${mortgage.finalYear}-${mortgage.finalMonth}
        </div>
        <div id="${graphId}" style="width:100%;height:600px;"></div>
      </div>
    `;
    $("#graphs-container").append(graphHtml);

    var colors = mortgage.colorScheme;
    var dataset = [
      {
        label: "Interest",
        data: mortgage.data1,
        color: colors.interest,
        stack: true,
        bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30, lineWidth: 1 }
      },
      {
        label: "Principal",
        data: mortgage.data2,
        color: colors.principal,
        stack: true,
        bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30, lineWidth: 1 }
      },
      {
        label: "Owing",
        data: mortgage.owing,
        color: colors.owing,
        yaxis: 2,
        stack: false,
        lines: { show: true, lineWidth: 2, fill: false }
      }
    ];

    var plot = $.plot($("#" + graphId), dataset, options1);
    allPlots.push({ plot: plot, element: $("#" + graphId), mortgage: mortgage });
  });

  // Setup synchronized tooltips
  setupSynchronizedTooltips();
}

// Setup tooltip for overlay mode
function setupTooltip(element, mortgagesData) {
  var previousPoint = null;
  var previousLabel = null;

  element.bind("plothover", function(event, pos, item) {
    if (item) {
      if ((previousLabel != item.series.label) || (previousPoint != item.dataIndex)) {
        previousPoint = item.dataIndex;
        previousLabel = item.series.label;
        $("#tooltip").remove();

        var x = item.datapoint[0];
        var y = item.datapoint[1];
        var color = item.series.color;

        var m = new Date(x).getMonth() + 1;
        var ms = m < 10 ? "0" + m.toString() : m.toString();
        var fy = new Date(x).getFullYear();
        var val = item.series.data[item.dataIndex][1];

        showTooltip(item.pageX, item.pageY, color,
          "<strong>" + item.series.label + "</strong><br>" + fy + "-" + ms +
          " : <strong>$" + val.toFixed(2).toLocaleString() + "</strong>");
      }
    } else {
      $("#tooltip").remove();
      previousPoint = null;
    }
  });
}

// Setup synchronized tooltips for side-by-side mode
function setupSynchronizedTooltips() {
  allPlots.forEach(function(plotObj) {
    var previousPoint = null;

    plotObj.element.bind("plothover", function(event, pos, item) {
      // Show tooltips on all graphs at the same x-position
      if (pos.x) {
        $("#tooltip").remove();

        // Find the closest data point time across all mortgages
        var timePos = pos.x;
        var tooltipHtml = "";

        allPlots.forEach(function(p) {
          var m = p.mortgage;
          // Find closest data point
          var closestPoint = findClosestDataPoint(m.owing, timePos);
          if (closestPoint) {
            var date = new Date(closestPoint[0]);
            var month = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
            var year = date.getFullYear();

            // Get interest and principal for this point
            var interestPoint = findClosestDataPoint(m.data1, timePos);
            var principalPoint = findClosestDataPoint(m.data2, timePos);

            tooltipHtml += `<div style="color: ${m.colorScheme.owing}; margin-bottom: 5px;">
              <strong>${m.name}</strong> (${year}-${month})<br>
              Interest: $${interestPoint ? interestPoint[1].toFixed(2) : '0'} |
              Principal: $${principalPoint ? principalPoint[1].toFixed(2) : '0'}<br>
              Owing: $${closestPoint[1].toFixed(2)}
            </div>`;
          }
        });

        if (tooltipHtml) {
          showTooltip(pos.pageX, pos.pageY, "#333", tooltipHtml);
        }
      } else {
        $("#tooltip").remove();
      }
    });

    plotObj.element.bind("mouseleave", function() {
      $("#tooltip").remove();
    });
  });
}

// Find closest data point to a given time
function findClosestDataPoint(dataArray, time) {
  if (!dataArray || dataArray.length === 0) return null;

  var closest = dataArray[0];
  var minDiff = Math.abs(dataArray[0][0] - time);

  for (var i = 1; i < dataArray.length; i++) {
    var diff = Math.abs(dataArray[i][0] - time);
    if (diff < minDiff) {
      minDiff = diff;
      closest = dataArray[i];
    }
  }

  return closest;
}

function showTooltip(x, y, color, contents) {
  $('<div id="tooltip">' + contents + '</div>').css({
    position: 'absolute',
    display: 'none',
    top: y - 40,
    left: x - 120,
    border: '2px solid ' + color,
    padding: '3px',
    'font-size': '9px',
    'border-radius': '5px',
    'background-color': '#fff',
    'font-family': 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
    opacity: 0.9,
    'z-index': 1000,
    'max-width': '300px'
  }).appendTo("body").fadeIn(200);
}

// Display summary graph showing totals of all mortgages
function displaySummaryGraph() {
  if (mortgages.length === 0) return;

  // Find the earliest start date and latest end date across all mortgages
  var d = new Date();
  var startYear = d.getFullYear();
  var startMonth = d.getMonth() + 1;
  var endYear = startYear;
  var endMonth = startMonth;

  mortgages.forEach(function(m) {
    if (m.finalYear > endYear || (m.finalYear === endYear && m.finalMonth > endMonth)) {
      endYear = m.finalYear;
      endMonth = m.finalMonth;
    }
  });

  // Create aggregated data by summing all mortgages for each month
  var summaryInterest = {};
  var summaryPrincipal = {};
  var summaryOwing = {};

  mortgages.forEach(function(mortgage) {
    mortgage.data1.forEach(function(point) {
      var time = point[0];
      summaryInterest[time] = (summaryInterest[time] || 0) + point[1];
    });

    mortgage.data2.forEach(function(point) {
      var time = point[0];
      summaryPrincipal[time] = (summaryPrincipal[time] || 0) + point[1];
    });

    mortgage.owing.forEach(function(point) {
      var time = point[0];
      summaryOwing[time] = (summaryOwing[time] || 0) + point[1];
    });
  });

  // Convert to arrays sorted by time
  var interestData = Object.keys(summaryInterest).sort().map(function(time) {
    return [parseFloat(time), summaryInterest[time]];
  });

  var principalData = Object.keys(summaryPrincipal).sort().map(function(time) {
    return [parseFloat(time), summaryPrincipal[time]];
  });

  var owingData = Object.keys(summaryOwing).sort().map(function(time) {
    return [parseFloat(time), summaryOwing[time]];
  });

  // Calculate totals
  var totalPrincipal = 0;
  var totalInterest = 0;
  mortgages.forEach(function(m) {
    totalPrincipal += m.principal;
    totalInterest += m.totalInterest;
  });

  var graphHtml = `
    <div class="graph-panel" style="margin-top: 40px; border-top: 3px solid #333; padding-top: 20px;">
      <div class="graph-title" style="background-color: #333; color: white; font-size: 16px;">
        SUMMARY: Total of All Mortgages Combined
      </div>
      <div class="graph-info" style="font-weight: bold; font-size: 14px;">
        Total Loan Amount: $${totalPrincipal.toFixed(2).toLocaleString()} |
        Total Interest Paid: $${totalInterest.toFixed(2).toLocaleString()} |
        Total Cost: $${(totalPrincipal + totalInterest).toFixed(2).toLocaleString()}
      </div>
      <div id="graph-summary" style="width:100%;height:700px;margin:20px auto;"></div>
    </div>
  `;

  $("#graphs-container").append(graphHtml);

  var dataset = [
    {
      label: "Total Interest (All Mortgages)",
      data: interestData,
      color: "#FF6B35",
      stack: true,
      bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30, lineWidth: 1 }
    },
    {
      label: "Total Principal (All Mortgages)",
      data: principalData,
      color: "#4ECDC4",
      stack: true,
      bars: { show: true, align: "center", barWidth: 24 * 60 * 60 * 600 * 30, lineWidth: 1 }
    },
    {
      label: "Total Amount Owing (All Mortgages)",
      data: owingData,
      color: "#C1292E",
      yaxis: 2,
      stack: false,
      lines: { show: true, lineWidth: 3, fill: false }
    }
  ];

  $.plot($("#graph-summary"), dataset, options1);
  setupTooltip($("#graph-summary"), mortgages);
}
