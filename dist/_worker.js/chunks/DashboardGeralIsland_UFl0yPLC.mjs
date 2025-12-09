globalThis.process ??= {}; globalThis.process.env ??= {};
import { j as jsxRuntimeExports, s as supabase } from './supabase_Di0qno_D.mjs';
import { r as reactExports } from './_@astro-renderers_DAXFO6RA.mjs';
import { u as usePermissao } from './usePermissao_BHj0yuGE.mjs';
import { c as createSelector, p as pickAxisType, b as pickAxisId, i as itemAxisPredicate, s as selectBaseAxis, d as combineGraphicalItemsSettings, e as combineGraphicalItemsData, f as selectChartDataAndAlwaysIgnoreIndexes, g as combineDisplayedData, h as combineAppliedValues, j as getValueByDataKey, k as selectAllErrorBarSettings, l as combineDomainOfAllAppliedNumericalValuesIncludingErrorValues, m as selectDomainDefinition, n as selectDomainFromUserPreference, o as selectChartLayout, q as combineNumericalDomain, r as selectStackOffsetType, t as combineAxisDomain, u as selectRealScaleType, v as combineNiceTicks, w as combineAxisDomainWithNiceTicks, x as getTooltipNameProp, y as selectChartOffsetInternal, z as useAppDispatch, A as setActiveMouseOverItemIndex, B as mouseLeaveItem, C as setActiveClickItemIndex, D as resolveDefaultProps, E as DefaultZIndexes, F as svgPropertiesNoEvents, G as RegisterGraphicalItemId, S as SetPolarGraphicalItem, H as findAllByType, I as useAppSelector, J as SetPolarLegendPayload, K as Layer, Z as ZIndexLayer, M as SetTooltipEntrySettings, N as useAnimationId, O as JavascriptAnimate, P as get, Q as interpolate, U as isNumber, V as mathSign, W as polarToCartesian, _ as PolarLabelListContextProvider, $ as selectActiveTooltipIndex, a0 as selectActiveTooltipDataKey, a1 as selectActiveTooltipGraphicalItemId, a2 as DATA_ITEM_DATAKEY_ATTRIBUTE_NAME, a3 as DATA_ITEM_INDEX_ATTRIBUTE_NAME, a4 as adaptEventsOfChild, a5 as Shape, a6 as LabelListFromLabelProp, a7 as getMaxRadius, a8 as getPercentValue, a9 as svgPropertiesNoEventsFromUnknown, aa as Curve, ab as Text, ac as isNullish, ad as isWellBehavedNumber, ae as propsAreEqual, af as useIsPanorama, ag as SetLegendPayload, ah as SetCartesianGraphicalItem, ai as getNormalizedStackId, aj as useNeedsClip, ak as useChartLayout, al as SetErrorBarContext, am as GraphicalItemClipPath, an as getBaseValueOfBar, ao as truncateByDomain, ap as getCateCoordinateOfBar, aq as CartesianLabelListContextProvider, ar as isNan, as as selectAxisViewBox, at as selectAxisWithScale, au as selectTicksOfGraphicalItem, av as selectChartDataWithIndexesIfNotInPanorama, aw as getBandSizeOfAxis, ax as selectUnfilteredCartesianItems, ay as selectRootMaxBarSize, az as selectBarGap, aA as selectBarCategoryGap, aB as selectStackGroups, aC as getStackSeriesIdentifier, aD as selectRootBarSize, aE as selectCartesianAxisSize, aF as isStacked, aG as CartesianChart, aH as arrayTooltipSearcher, aI as updatePolarOptions, aJ as RechartsStoreProvider, aK as ChartDataContextProvider, aL as ReportMainChartProps, aM as ReportChartProps, aN as CategoricalChart, R as ResponsiveContainer, X as XAxis, Y as YAxis, T as Tooltip, L as LineChart, a as Line } from './LineChart_DFwUCWgc.mjs';
import { j as clsx } from './astro/server_C6Zr-jH2.mjs';

/**
 * @fileOverview Cross
 */

var Cell = _props => null;
Cell.displayName = 'Cell';

var selectUnfilteredPolarItems = state => state.graphicalItems.polarItems;
var selectAxisPredicate = createSelector([pickAxisType, pickAxisId], itemAxisPredicate);
var selectPolarItemsSettings = createSelector([selectUnfilteredPolarItems, selectBaseAxis, selectAxisPredicate], combineGraphicalItemsSettings);
var selectPolarGraphicalItemsData = createSelector([selectPolarItemsSettings], combineGraphicalItemsData);
var selectPolarDisplayedData = createSelector([selectPolarGraphicalItemsData, selectChartDataAndAlwaysIgnoreIndexes], combineDisplayedData);
var selectPolarAppliedValues = createSelector([selectPolarDisplayedData, selectBaseAxis, selectPolarItemsSettings], combineAppliedValues);
createSelector([selectPolarDisplayedData, selectBaseAxis, selectPolarItemsSettings], (data, axisSettings, items) => {
  if (items.length > 0) {
    return data.flatMap(entry => {
      return items.flatMap(item => {
        var _axisSettings$dataKey;
        var valueByDataKey = getValueByDataKey(entry, (_axisSettings$dataKey = axisSettings.dataKey) !== null && _axisSettings$dataKey !== void 0 ? _axisSettings$dataKey : item.dataKey);
        return {
          value: valueByDataKey,
          errorDomain: [] // polar charts do not have error bars
        };
      });
    }).filter(Boolean);
  }
  if ((axisSettings === null || axisSettings === void 0 ? void 0 : axisSettings.dataKey) != null) {
    return data.map(item => ({
      value: getValueByDataKey(item, axisSettings.dataKey),
      errorDomain: []
    }));
  }
  return data.map(entry => ({
    value: entry,
    errorDomain: []
  }));
});
var unsupportedInPolarChart = () => undefined;
var selectDomainOfAllPolarAppliedNumericalValues = createSelector([selectPolarDisplayedData, selectBaseAxis, selectPolarItemsSettings, selectAllErrorBarSettings, pickAxisType], combineDomainOfAllAppliedNumericalValuesIncludingErrorValues);
var selectPolarNumericalDomain = createSelector([selectBaseAxis, selectDomainDefinition, selectDomainFromUserPreference, unsupportedInPolarChart, selectDomainOfAllPolarAppliedNumericalValues, unsupportedInPolarChart, selectChartLayout, pickAxisType], combineNumericalDomain);
var selectPolarAxisDomain = createSelector([selectBaseAxis, selectChartLayout, selectPolarDisplayedData, selectPolarAppliedValues, selectStackOffsetType, pickAxisType, selectPolarNumericalDomain], combineAxisDomain);
var selectPolarNiceTicks = createSelector([selectPolarAxisDomain, selectBaseAxis, selectRealScaleType], combineNiceTicks);
createSelector([selectBaseAxis, selectPolarAxisDomain, selectPolarNiceTicks, pickAxisType], combineAxisDomainWithNiceTicks);

function ownKeys$5(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread$5(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$5(Object(t), true).forEach(function (r) { _defineProperty$5(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$5(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty$5(e, r, t) { return (r = _toPropertyKey$5(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey$5(t) { var i = _toPrimitive$5(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive$5(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var pickId = (_state, id) => id;
var selectSynchronisedPieSettings = createSelector([selectUnfilteredPolarItems, pickId], (graphicalItems, id) => graphicalItems.filter(item => item.type === 'pie').find(item => item.id === id));

// Keep stable reference to an empty array to prevent re-renders
var emptyArray = [];
var pickCells$1 = (_state, _id, cells) => {
  if ((cells === null || cells === void 0 ? void 0 : cells.length) === 0) {
    return emptyArray;
  }
  return cells;
};
var selectDisplayedData = createSelector([selectChartDataAndAlwaysIgnoreIndexes, selectSynchronisedPieSettings, pickCells$1], (_ref, pieSettings, cells) => {
  var {
    chartData
  } = _ref;
  if (pieSettings == null) {
    return undefined;
  }
  var displayedData;
  if ((pieSettings === null || pieSettings === void 0 ? void 0 : pieSettings.data) != null && pieSettings.data.length > 0) {
    displayedData = pieSettings.data;
  } else {
    displayedData = chartData;
  }
  if ((!displayedData || !displayedData.length) && cells != null) {
    displayedData = cells.map(cell => _objectSpread$5(_objectSpread$5({}, pieSettings.presentationProps), cell.props));
  }
  if (displayedData == null) {
    return undefined;
  }
  return displayedData;
});
var selectPieLegend = createSelector([selectDisplayedData, selectSynchronisedPieSettings, pickCells$1], (displayedData, pieSettings, cells) => {
  if (displayedData == null || pieSettings == null) {
    return undefined;
  }
  return displayedData.map((entry, i) => {
    var _cells$i;
    var name = getValueByDataKey(entry, pieSettings.nameKey, pieSettings.name);
    var color;
    if (cells !== null && cells !== void 0 && (_cells$i = cells[i]) !== null && _cells$i !== void 0 && (_cells$i = _cells$i.props) !== null && _cells$i !== void 0 && _cells$i.fill) {
      color = cells[i].props.fill;
    } else if (typeof entry === 'object' && entry != null && 'fill' in entry) {
      color = entry.fill;
    } else {
      color = pieSettings.fill;
    }
    return {
      value: getTooltipNameProp(name, pieSettings.dataKey),
      color,
      // @ts-expect-error we need a better typing for our data inputs
      payload: entry,
      type: pieSettings.legendType
    };
  });
});
var selectPieSectors = createSelector([selectDisplayedData, selectSynchronisedPieSettings, pickCells$1, selectChartOffsetInternal], (displayedData, pieSettings, cells, offset) => {
  if (pieSettings == null || displayedData == null) {
    return undefined;
  }
  return computePieSectors({
    offset,
    pieSettings,
    displayedData,
    cells
  });
});

var useMouseEnterItemDispatch = (onMouseEnterFromProps, dataKey, graphicalItemId) => {
  var dispatch = useAppDispatch();
  return (data, index) => event => {
    onMouseEnterFromProps === null || onMouseEnterFromProps === void 0 || onMouseEnterFromProps(data, index, event);
    dispatch(setActiveMouseOverItemIndex({
      activeIndex: String(index),
      activeDataKey: dataKey,
      activeCoordinate: data.tooltipPosition,
      activeGraphicalItemId: graphicalItemId
    }));
  };
};
var useMouseLeaveItemDispatch = onMouseLeaveFromProps => {
  var dispatch = useAppDispatch();
  return (data, index) => event => {
    onMouseLeaveFromProps === null || onMouseLeaveFromProps === void 0 || onMouseLeaveFromProps(data, index, event);
    dispatch(mouseLeaveItem());
  };
};
var useMouseClickItemDispatch = (onMouseClickFromProps, dataKey, graphicalItemId) => {
  var dispatch = useAppDispatch();
  return (data, index) => event => {
    onMouseClickFromProps === null || onMouseClickFromProps === void 0 || onMouseClickFromProps(data, index, event);
    dispatch(setActiveClickItemIndex({
      activeIndex: String(index),
      activeDataKey: dataKey,
      activeCoordinate: data.tooltipPosition,
      activeGraphicalItemId: graphicalItemId
    }));
  };
};

var _excluded$3 = ["key"],
  _excluded2$1 = ["onMouseEnter", "onClick", "onMouseLeave"],
  _excluded3$1 = ["id"],
  _excluded4$1 = ["id"];
function ownKeys$4(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread$4(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$4(Object(t), true).forEach(function (r) { _defineProperty$4(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$4(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty$4(e, r, t) { return (r = _toPropertyKey$4(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey$4(t) { var i = _toPrimitive$4(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive$4(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _extends$3() { return _extends$3 = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends$3.apply(null, arguments); }
function _objectWithoutProperties$3(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose$3(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose$3(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }

/**
 * The `label` prop in Pie accepts a variety of alternatives.
 */

/**
 * We spread the data object into the sector data item,
 * so we can't really know what is going to be inside.
 *
 * This type represents our best effort, but it all depends on the input data
 * and what is inside of it.
 *
 * https://github.com/recharts/recharts/issues/6380
 * https://github.com/recharts/recharts/discussions/6375
 */

/**
 * Internal props, combination of external props + defaultProps + private Recharts state
 */

function SetPiePayloadLegend(props) {
  var cells = reactExports.useMemo(() => findAllByType(props.children, Cell), [props.children]);
  var legendPayload = useAppSelector(state => selectPieLegend(state, props.id, cells));
  if (legendPayload == null) {
    return null;
  }
  return /*#__PURE__*/reactExports.createElement(SetPolarLegendPayload, {
    legendPayload: legendPayload
  });
}
var SetPieTooltipEntrySettings = /*#__PURE__*/reactExports.memo(_ref => {
  var {
    dataKey,
    nameKey,
    sectors,
    stroke,
    strokeWidth,
    fill,
    name,
    hide,
    tooltipType
  } = _ref;
  var tooltipEntrySettings = {
    dataDefinedOnItem: sectors.map(p => p.tooltipPayload),
    positions: sectors.map(p => p.tooltipPosition),
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey,
      name: getTooltipNameProp(name, dataKey),
      hide,
      type: tooltipType,
      color: fill,
      unit: '' // why doesn't Pie support unit?
    }
  };
  return /*#__PURE__*/reactExports.createElement(SetTooltipEntrySettings, {
    tooltipEntrySettings: tooltipEntrySettings
  });
});
var getTextAnchor = (x, cx) => {
  if (x > cx) {
    return 'start';
  }
  if (x < cx) {
    return 'end';
  }
  return 'middle';
};
var getOuterRadius = (dataPoint, outerRadius, maxPieRadius) => {
  if (typeof outerRadius === 'function') {
    return getPercentValue(outerRadius(dataPoint), maxPieRadius, maxPieRadius * 0.8);
  }
  return getPercentValue(outerRadius, maxPieRadius, maxPieRadius * 0.8);
};
var parseCoordinateOfPie = (pieSettings, offset, dataPoint) => {
  var {
    top,
    left,
    width,
    height
  } = offset;
  var maxPieRadius = getMaxRadius(width, height);
  var cx = left + getPercentValue(pieSettings.cx, width, width / 2);
  var cy = top + getPercentValue(pieSettings.cy, height, height / 2);
  var innerRadius = getPercentValue(pieSettings.innerRadius, maxPieRadius, 0);
  var outerRadius = getOuterRadius(dataPoint, pieSettings.outerRadius, maxPieRadius);
  var maxRadius = pieSettings.maxRadius || Math.sqrt(width * width + height * height) / 2;
  return {
    cx,
    cy,
    innerRadius,
    outerRadius,
    maxRadius
  };
};
var parseDeltaAngle = (startAngle, endAngle) => {
  var sign = mathSign(endAngle - startAngle);
  var deltaAngle = Math.min(Math.abs(endAngle - startAngle), 360);
  return sign * deltaAngle;
};
function getClassNamePropertyIfExists(u) {
  if (u && typeof u === 'object' && 'className' in u && typeof u.className === 'string') {
    return u.className;
  }
  return '';
}
var renderLabelLineItem = (option, props) => {
  if (/*#__PURE__*/reactExports.isValidElement(option)) {
    // @ts-expect-error we can't know if the type of props matches the element
    return /*#__PURE__*/reactExports.cloneElement(option, props);
  }
  if (typeof option === 'function') {
    return option(props);
  }
  var className = clsx('recharts-pie-label-line', typeof option !== 'boolean' ? option.className : '');
  // React doesn't like it when we spread a key property onto an element
  var {
      key
    } = props,
    otherProps = _objectWithoutProperties$3(props, _excluded$3);
  return /*#__PURE__*/reactExports.createElement(Curve, _extends$3({}, otherProps, {
    type: "linear",
    className: className
  }));
};
var renderLabelItem = (option, props, value) => {
  if (/*#__PURE__*/reactExports.isValidElement(option)) {
    // @ts-expect-error element cloning is not typed
    return /*#__PURE__*/reactExports.cloneElement(option, props);
  }
  var label = value;
  if (typeof option === 'function') {
    label = option(props);
    if (/*#__PURE__*/reactExports.isValidElement(label)) {
      return label;
    }
  }
  var className = clsx('recharts-pie-label-text', getClassNamePropertyIfExists(option));
  return /*#__PURE__*/reactExports.createElement(Text, _extends$3({}, props, {
    alignmentBaseline: "middle",
    className: className
  }), label);
};
function PieLabels(_ref2) {
  var {
    sectors,
    props,
    showLabels
  } = _ref2;
  var {
    label,
    labelLine,
    dataKey
  } = props;
  if (!showLabels || !label || !sectors) {
    return null;
  }
  var pieProps = svgPropertiesNoEvents(props);
  var customLabelProps = svgPropertiesNoEventsFromUnknown(label);
  var customLabelLineProps = svgPropertiesNoEventsFromUnknown(labelLine);
  var offsetRadius = typeof label === 'object' && 'offsetRadius' in label && typeof label.offsetRadius === 'number' && label.offsetRadius || 20;
  var labels = sectors.map((entry, i) => {
    var midAngle = (entry.startAngle + entry.endAngle) / 2;
    var endPoint = polarToCartesian(entry.cx, entry.cy, entry.outerRadius + offsetRadius, midAngle);
    var labelProps = _objectSpread$4(_objectSpread$4(_objectSpread$4(_objectSpread$4({}, pieProps), entry), {}, {
      // @ts-expect-error customLabelProps is contributing unknown props
      stroke: 'none'
    }, customLabelProps), {}, {
      index: i,
      textAnchor: getTextAnchor(endPoint.x, entry.cx)
    }, endPoint);
    var lineProps = _objectSpread$4(_objectSpread$4(_objectSpread$4(_objectSpread$4({}, pieProps), entry), {}, {
      // @ts-expect-error customLabelLineProps is contributing unknown props
      fill: 'none',
      // @ts-expect-error customLabelLineProps is contributing unknown props
      stroke: entry.fill
    }, customLabelLineProps), {}, {
      index: i,
      points: [polarToCartesian(entry.cx, entry.cy, entry.outerRadius, midAngle), endPoint],
      key: 'line'
    });
    return /*#__PURE__*/reactExports.createElement(ZIndexLayer, {
      zIndex: DefaultZIndexes.label,
      key: "label-".concat(entry.startAngle, "-").concat(entry.endAngle, "-").concat(entry.midAngle, "-").concat(i)
    }, /*#__PURE__*/reactExports.createElement(Layer, null, labelLine && renderLabelLineItem(labelLine, lineProps), renderLabelItem(label, labelProps, getValueByDataKey(entry, dataKey))));
  });
  return /*#__PURE__*/reactExports.createElement(Layer, {
    className: "recharts-pie-labels"
  }, labels);
}
function PieLabelList(_ref3) {
  var {
    sectors,
    props,
    showLabels
  } = _ref3;
  var {
    label
  } = props;
  if (typeof label === 'object' && label != null && 'position' in label) {
    return /*#__PURE__*/reactExports.createElement(LabelListFromLabelProp, {
      label: label
    });
  }
  return /*#__PURE__*/reactExports.createElement(PieLabels, {
    sectors: sectors,
    props: props,
    showLabels: showLabels
  });
}
function PieSectors(props) {
  var {
    sectors,
    activeShape,
    inactiveShape: inactiveShapeProp,
    allOtherPieProps,
    shape,
    id
  } = props;
  var activeIndex = useAppSelector(selectActiveTooltipIndex);
  var activeDataKey = useAppSelector(selectActiveTooltipDataKey);
  var activeGraphicalItemId = useAppSelector(selectActiveTooltipGraphicalItemId);
  var {
      onMouseEnter: onMouseEnterFromProps,
      onClick: onItemClickFromProps,
      onMouseLeave: onMouseLeaveFromProps
    } = allOtherPieProps,
    restOfAllOtherProps = _objectWithoutProperties$3(allOtherPieProps, _excluded2$1);
  var onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, allOtherPieProps.dataKey, id);
  var onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  var onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, allOtherPieProps.dataKey, id);
  if (sectors == null || sectors.length === 0) {
    return null;
  }
  return /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, sectors.map((entry, i) => {
    if ((entry === null || entry === void 0 ? void 0 : entry.startAngle) === 0 && (entry === null || entry === void 0 ? void 0 : entry.endAngle) === 0 && sectors.length !== 1) return null;

    // For Pie charts, when multiple Pies share the same dataKey, we need to ensure only the hovered Pie's sector is active.
    // We do this by checking if the active graphical item ID matches this Pie's ID.
    var graphicalItemMatches = activeGraphicalItemId == null || activeGraphicalItemId === id;
    var isActive = String(i) === activeIndex && (activeDataKey == null || allOtherPieProps.dataKey === activeDataKey) && graphicalItemMatches;
    var inactiveShape = activeIndex ? inactiveShapeProp : null;
    var sectorOptions = activeShape && isActive ? activeShape : inactiveShape;
    var sectorProps = _objectSpread$4(_objectSpread$4({}, entry), {}, {
      stroke: entry.stroke,
      tabIndex: -1,
      [DATA_ITEM_INDEX_ATTRIBUTE_NAME]: i,
      [DATA_ITEM_DATAKEY_ATTRIBUTE_NAME]: allOtherPieProps.dataKey
    });
    return /*#__PURE__*/reactExports.createElement(Layer, _extends$3({
      key: "sector-".concat(entry === null || entry === void 0 ? void 0 : entry.startAngle, "-").concat(entry === null || entry === void 0 ? void 0 : entry.endAngle, "-").concat(entry.midAngle, "-").concat(i),
      tabIndex: -1,
      className: "recharts-pie-sector"
    }, adaptEventsOfChild(restOfAllOtherProps, entry, i), {
      // @ts-expect-error the types need a bit of attention
      onMouseEnter: onMouseEnterFromContext(entry, i)
      // @ts-expect-error the types need a bit of attention
      ,
      onMouseLeave: onMouseLeaveFromContext(entry, i)
      // @ts-expect-error the types need a bit of attention
      ,
      onClick: onClickFromContext(entry, i)
    }), /*#__PURE__*/reactExports.createElement(Shape, _extends$3({
      option: shape !== null && shape !== void 0 ? shape : sectorOptions,
      index: i,
      shapeType: "sector",
      isActive: isActive
    }, sectorProps)));
  }));
}
function computePieSectors(_ref4) {
  var _pieSettings$paddingA;
  var {
    pieSettings,
    displayedData,
    cells,
    offset
  } = _ref4;
  var {
    cornerRadius,
    startAngle,
    endAngle,
    dataKey,
    nameKey,
    tooltipType
  } = pieSettings;
  var minAngle = Math.abs(pieSettings.minAngle);
  var deltaAngle = parseDeltaAngle(startAngle, endAngle);
  var absDeltaAngle = Math.abs(deltaAngle);
  var paddingAngle = displayedData.length <= 1 ? 0 : (_pieSettings$paddingA = pieSettings.paddingAngle) !== null && _pieSettings$paddingA !== void 0 ? _pieSettings$paddingA : 0;
  var notZeroItemCount = displayedData.filter(entry => getValueByDataKey(entry, dataKey, 0) !== 0).length;
  var totalPaddingAngle = (absDeltaAngle >= 360 ? notZeroItemCount : notZeroItemCount - 1) * paddingAngle;
  var realTotalAngle = absDeltaAngle - notZeroItemCount * minAngle - totalPaddingAngle;
  var sum = displayedData.reduce((result, entry) => {
    var val = getValueByDataKey(entry, dataKey, 0);
    return result + (isNumber(val) ? val : 0);
  }, 0);
  var sectors;
  if (sum > 0) {
    var prev;
    sectors = displayedData.map((entry, i) => {
      // @ts-expect-error getValueByDataKey does not validate the output type
      var val = getValueByDataKey(entry, dataKey, 0);
      // @ts-expect-error getValueByDataKey does not validate the output type
      var name = getValueByDataKey(entry, nameKey, i);
      var coordinate = parseCoordinateOfPie(pieSettings, offset, entry);
      var percent = (isNumber(val) ? val : 0) / sum;
      var tempStartAngle;
      var entryWithCellInfo = _objectSpread$4(_objectSpread$4({}, entry), cells && cells[i] && cells[i].props);
      if (i) {
        tempStartAngle = prev.endAngle + mathSign(deltaAngle) * paddingAngle * (val !== 0 ? 1 : 0);
      } else {
        tempStartAngle = startAngle;
      }
      var tempEndAngle = tempStartAngle + mathSign(deltaAngle) * ((val !== 0 ? minAngle : 0) + percent * realTotalAngle);
      var midAngle = (tempStartAngle + tempEndAngle) / 2;
      var middleRadius = (coordinate.innerRadius + coordinate.outerRadius) / 2;
      var tooltipPayload = [{
        name,
        value: val,
        payload: entryWithCellInfo,
        dataKey,
        type: tooltipType
      }];
      var tooltipPosition = polarToCartesian(coordinate.cx, coordinate.cy, middleRadius, midAngle);
      prev = _objectSpread$4(_objectSpread$4(_objectSpread$4(_objectSpread$4({}, pieSettings.presentationProps), {}, {
        percent,
        cornerRadius: typeof cornerRadius === 'string' ? parseFloat(cornerRadius) : cornerRadius,
        name,
        tooltipPayload,
        midAngle,
        middleRadius,
        tooltipPosition
      }, entryWithCellInfo), coordinate), {}, {
        value: val,
        dataKey,
        startAngle: tempStartAngle,
        endAngle: tempEndAngle,
        payload: entryWithCellInfo,
        paddingAngle: mathSign(deltaAngle) * paddingAngle
      });
      return prev;
    });
  }
  return sectors;
}
function PieLabelListProvider(_ref5) {
  var {
    showLabels,
    sectors,
    children
  } = _ref5;
  var labelListEntries = reactExports.useMemo(() => {
    if (!showLabels || !sectors) {
      return [];
    }
    return sectors.map(entry => ({
      value: entry.value,
      payload: entry.payload,
      clockWise: false,
      parentViewBox: undefined,
      viewBox: {
        cx: entry.cx,
        cy: entry.cy,
        innerRadius: entry.innerRadius,
        outerRadius: entry.outerRadius,
        startAngle: entry.startAngle,
        endAngle: entry.endAngle,
        clockWise: false
      },
      fill: entry.fill
    }));
  }, [sectors, showLabels]);
  return /*#__PURE__*/reactExports.createElement(PolarLabelListContextProvider, {
    value: showLabels ? labelListEntries : undefined
  }, children);
}
function SectorsWithAnimation(_ref6) {
  var {
    props,
    previousSectorsRef,
    id
  } = _ref6;
  var {
    sectors,
    isAnimationActive,
    animationBegin,
    animationDuration,
    animationEasing,
    activeShape,
    inactiveShape,
    onAnimationStart,
    onAnimationEnd
  } = props;
  var animationId = useAnimationId(props, 'recharts-pie-');
  var prevSectors = previousSectorsRef.current;
  var [isAnimating, setIsAnimating] = reactExports.useState(false);
  var handleAnimationEnd = reactExports.useCallback(() => {
    if (typeof onAnimationEnd === 'function') {
      onAnimationEnd();
    }
    setIsAnimating(false);
  }, [onAnimationEnd]);
  var handleAnimationStart = reactExports.useCallback(() => {
    if (typeof onAnimationStart === 'function') {
      onAnimationStart();
    }
    setIsAnimating(true);
  }, [onAnimationStart]);
  return /*#__PURE__*/reactExports.createElement(PieLabelListProvider, {
    showLabels: !isAnimating,
    sectors: sectors
  }, /*#__PURE__*/reactExports.createElement(JavascriptAnimate, {
    animationId: animationId,
    begin: animationBegin,
    duration: animationDuration,
    isActive: isAnimationActive,
    easing: animationEasing,
    onAnimationStart: handleAnimationStart,
    onAnimationEnd: handleAnimationEnd,
    key: animationId
  }, t => {
    var stepData = [];
    var first = sectors && sectors[0];
    var curAngle = first === null || first === void 0 ? void 0 : first.startAngle;
    sectors === null || sectors === void 0 || sectors.forEach((entry, index) => {
      var prev = prevSectors && prevSectors[index];
      var paddingAngle = index > 0 ? get(entry, 'paddingAngle', 0) : 0;
      if (prev) {
        var angle = interpolate(prev.endAngle - prev.startAngle, entry.endAngle - entry.startAngle, t);
        var latest = _objectSpread$4(_objectSpread$4({}, entry), {}, {
          startAngle: curAngle + paddingAngle,
          endAngle: curAngle + angle + paddingAngle
        });
        stepData.push(latest);
        curAngle = latest.endAngle;
      } else {
        var {
          endAngle,
          startAngle
        } = entry;
        var deltaAngle = interpolate(0, endAngle - startAngle, t);
        var _latest = _objectSpread$4(_objectSpread$4({}, entry), {}, {
          startAngle: curAngle + paddingAngle,
          endAngle: curAngle + deltaAngle + paddingAngle
        });
        stepData.push(_latest);
        curAngle = _latest.endAngle;
      }
    });

    // eslint-disable-next-line no-param-reassign
    previousSectorsRef.current = stepData;
    return /*#__PURE__*/reactExports.createElement(Layer, null, /*#__PURE__*/reactExports.createElement(PieSectors, {
      sectors: stepData,
      activeShape: activeShape,
      inactiveShape: inactiveShape,
      allOtherPieProps: props,
      shape: props.shape,
      id: id
    }));
  }), /*#__PURE__*/reactExports.createElement(PieLabelList, {
    showLabels: !isAnimating,
    sectors: sectors,
    props: props
  }), props.children);
}
var defaultPieProps = {
  animationBegin: 400,
  animationDuration: 1500,
  animationEasing: 'ease',
  cx: '50%',
  cy: '50%',
  dataKey: 'value',
  endAngle: 360,
  fill: '#808080',
  hide: false,
  innerRadius: 0,
  isAnimationActive: 'auto',
  label: false,
  labelLine: true,
  legendType: 'rect',
  minAngle: 0,
  nameKey: 'name',
  outerRadius: '80%',
  paddingAngle: 0,
  rootTabIndex: 0,
  startAngle: 0,
  stroke: '#fff',
  zIndex: DefaultZIndexes.area
};
function PieImpl(props) {
  var {
      id
    } = props,
    propsWithoutId = _objectWithoutProperties$3(props, _excluded3$1);
  var {
    hide,
    className,
    rootTabIndex
  } = props;
  var cells = reactExports.useMemo(() => findAllByType(props.children, Cell), [props.children]);
  var sectors = useAppSelector(state => selectPieSectors(state, id, cells));
  var previousSectorsRef = reactExports.useRef(null);
  var layerClass = clsx('recharts-pie', className);
  if (hide || sectors == null) {
    previousSectorsRef.current = null;
    return /*#__PURE__*/reactExports.createElement(Layer, {
      tabIndex: rootTabIndex,
      className: layerClass
    });
  }
  return /*#__PURE__*/reactExports.createElement(ZIndexLayer, {
    zIndex: props.zIndex
  }, /*#__PURE__*/reactExports.createElement(SetPieTooltipEntrySettings, {
    dataKey: props.dataKey,
    nameKey: props.nameKey,
    sectors: sectors,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    fill: props.fill,
    name: props.name,
    hide: props.hide,
    tooltipType: props.tooltipType
  }), /*#__PURE__*/reactExports.createElement(Layer, {
    tabIndex: rootTabIndex,
    className: layerClass
  }, /*#__PURE__*/reactExports.createElement(SectorsWithAnimation, {
    props: _objectSpread$4(_objectSpread$4({}, propsWithoutId), {}, {
      sectors
    }),
    previousSectorsRef: previousSectorsRef,
    id: id
  })));
}
function Pie(outsideProps) {
  var props = resolveDefaultProps(outsideProps, defaultPieProps);
  var {
      id: externalId
    } = props,
    propsWithoutId = _objectWithoutProperties$3(props, _excluded4$1);
  var presentationProps = svgPropertiesNoEvents(propsWithoutId);
  return /*#__PURE__*/reactExports.createElement(RegisterGraphicalItemId, {
    id: externalId,
    type: "pie"
  }, id => /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, /*#__PURE__*/reactExports.createElement(SetPolarGraphicalItem, {
    type: "pie",
    id: id,
    data: propsWithoutId.data,
    dataKey: propsWithoutId.dataKey,
    hide: propsWithoutId.hide,
    angleAxisId: 0,
    radiusAxisId: 0,
    name: propsWithoutId.name,
    nameKey: propsWithoutId.nameKey,
    tooltipType: propsWithoutId.tooltipType,
    legendType: propsWithoutId.legendType,
    fill: propsWithoutId.fill,
    cx: propsWithoutId.cx,
    cy: propsWithoutId.cy,
    startAngle: propsWithoutId.startAngle,
    endAngle: propsWithoutId.endAngle,
    paddingAngle: propsWithoutId.paddingAngle,
    minAngle: propsWithoutId.minAngle,
    innerRadius: propsWithoutId.innerRadius,
    outerRadius: propsWithoutId.outerRadius,
    cornerRadius: propsWithoutId.cornerRadius,
    presentationProps: presentationProps,
    maxRadius: props.maxRadius
  }), /*#__PURE__*/reactExports.createElement(SetPiePayloadLegend, _extends$3({}, propsWithoutId, {
    id: id
  })), /*#__PURE__*/reactExports.createElement(PieImpl, _extends$3({}, propsWithoutId, {
    id: id
  }))));
}
Pie.displayName = 'Pie';

var prefix = "Invariant failed";
function invariant(condition, message) {
  {
    throw new Error(prefix);
  }
}

var _excluded$2 = ["x", "y"];
function _extends$2() { return _extends$2 = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends$2.apply(null, arguments); }
function ownKeys$3(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread$3(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$3(Object(t), true).forEach(function (r) { _defineProperty$3(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$3(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty$3(e, r, t) { return (r = _toPropertyKey$3(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey$3(t) { var i = _toPrimitive$3(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive$3(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _objectWithoutProperties$2(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose$2(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose$2(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }

// Rectangle props is expecting x, y, height, width as numbers, name as a string, and radius as a custom type
// When props are being spread in from a user defined component in Bar,
// the prop types of an SVGElement have these typed as something else.
// This function will return the passed in props
// along with x, y, height as numbers, name as a string, and radius as number | [number, number, number, number]
function typeguardBarRectangleProps(_ref, props) {
  var {
      x: xProp,
      y: yProp
    } = _ref,
    option = _objectWithoutProperties$2(_ref, _excluded$2);
  var xValue = "".concat(xProp);
  var x = parseInt(xValue, 10);
  var yValue = "".concat(yProp);
  var y = parseInt(yValue, 10);
  var heightValue = "".concat(props.height || option.height);
  var height = parseInt(heightValue, 10);
  var widthValue = "".concat(props.width || option.width);
  var width = parseInt(widthValue, 10);
  return _objectSpread$3(_objectSpread$3(_objectSpread$3(_objectSpread$3(_objectSpread$3({}, props), option), x ? {
    x
  } : {}), y ? {
    y
  } : {}), {}, {
    height,
    width,
    name: props.name,
    radius: props.radius
  });
}
function BarRectangle(props) {
  return /*#__PURE__*/reactExports.createElement(Shape, _extends$2({
    shapeType: "rectangle",
    propTransformer: typeguardBarRectangleProps,
    activeClassName: "recharts-active-bar"
  }, props));
}
/**
 * Safely gets minPointSize from the minPointSize prop if it is a function
 * @param minPointSize minPointSize as passed to the Bar component
 * @param defaultValue default minPointSize
 * @returns minPointSize
 */
var minPointSizeCallback = function minPointSizeCallback(minPointSize) {
  var defaultValue = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  return (value, index) => {
    if (isNumber(minPointSize)) return minPointSize;
    var isValueNumberOrNil = isNumber(value) || isNullish(value);
    if (isValueNumberOrNil) {
      return minPointSize(value, index);
    }
    !isValueNumberOrNil ? invariant()  : void 0;
    return defaultValue;
  };
};

function getZIndexFromUnknown(input, defaultZIndex) {
  if (input && typeof input === 'object' && 'zIndex' in input && typeof input.zIndex === 'number' && isWellBehavedNumber(input.zIndex)) {
    return input.zIndex;
  }
  return defaultZIndex;
}

var _excluded$1 = ["onMouseEnter", "onMouseLeave", "onClick"],
  _excluded2 = ["value", "background", "tooltipPosition"],
  _excluded3 = ["id"],
  _excluded4 = ["onMouseEnter", "onClick", "onMouseLeave"];
function _extends$1() { return _extends$1 = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends$1.apply(null, arguments); }
function ownKeys$2(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread$2(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$2(Object(t), true).forEach(function (r) { _defineProperty$2(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$2(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty$2(e, r, t) { return (r = _toPropertyKey$2(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey$2(t) { var i = _toPrimitive$2(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive$2(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _objectWithoutProperties$1(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose$1(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose$1(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
var computeLegendPayloadFromBarData = props => {
  var {
    dataKey,
    name,
    fill,
    legendType,
    hide
  } = props;
  return [{
    inactive: hide,
    dataKey,
    type: legendType,
    color: fill,
    value: getTooltipNameProp(name, dataKey),
    payload: props
  }];
};
var SetBarTooltipEntrySettings = /*#__PURE__*/reactExports.memo(_ref => {
  var {
    dataKey,
    stroke,
    strokeWidth,
    fill,
    name,
    hide,
    unit,
    tooltipType
  } = _ref;
  var tooltipEntrySettings = {
    dataDefinedOnItem: undefined,
    positions: undefined,
    settings: {
      stroke,
      strokeWidth,
      fill,
      dataKey,
      nameKey: undefined,
      name: getTooltipNameProp(name, dataKey),
      hide,
      type: tooltipType,
      color: fill,
      unit
    }
  };
  return /*#__PURE__*/reactExports.createElement(SetTooltipEntrySettings, {
    tooltipEntrySettings: tooltipEntrySettings
  });
});
function BarBackground(props) {
  var activeIndex = useAppSelector(selectActiveTooltipIndex);
  var {
    data,
    dataKey,
    background: backgroundFromProps,
    allOtherBarProps
  } = props;
  var {
      onMouseEnter: onMouseEnterFromProps,
      onMouseLeave: onMouseLeaveFromProps,
      onClick: onItemClickFromProps
    } = allOtherBarProps,
    restOfAllOtherProps = _objectWithoutProperties$1(allOtherBarProps, _excluded$1);

  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, dataKey);
  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, dataKey);
  if (!backgroundFromProps || data == null) {
    return null;
  }
  var backgroundProps = svgPropertiesNoEventsFromUnknown(backgroundFromProps);
  return /*#__PURE__*/reactExports.createElement(ZIndexLayer, {
    zIndex: getZIndexFromUnknown(backgroundFromProps, DefaultZIndexes.barBackground)
  }, data.map((entry, i) => {
    var {
        value,
        background: backgroundFromDataEntry,
        tooltipPosition
      } = entry,
      rest = _objectWithoutProperties$1(entry, _excluded2);
    if (!backgroundFromDataEntry) {
      return null;
    }

    // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
    var onMouseEnter = onMouseEnterFromContext(entry, i);
    // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
    var onMouseLeave = onMouseLeaveFromContext(entry, i);
    // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
    var onClick = onClickFromContext(entry, i);
    var barRectangleProps = _objectSpread$2(_objectSpread$2(_objectSpread$2(_objectSpread$2(_objectSpread$2({
      option: backgroundFromProps,
      isActive: String(i) === activeIndex
    }, rest), {}, {
      // @ts-expect-error backgroundProps is contributing unknown props
      fill: '#eee'
    }, backgroundFromDataEntry), backgroundProps), adaptEventsOfChild(restOfAllOtherProps, entry, i)), {}, {
      onMouseEnter,
      onMouseLeave,
      onClick,
      dataKey,
      index: i,
      className: 'recharts-bar-background-rectangle'
    });
    return /*#__PURE__*/reactExports.createElement(BarRectangle, _extends$1({
      key: "background-bar-".concat(i)
    }, barRectangleProps));
  }));
}
function BarLabelListProvider(_ref2) {
  var {
    showLabels,
    children,
    rects
  } = _ref2;
  var labelListEntries = rects === null || rects === void 0 ? void 0 : rects.map(entry => {
    var viewBox = {
      x: entry.x,
      y: entry.y,
      width: entry.width,
      lowerWidth: entry.width,
      upperWidth: entry.width,
      height: entry.height
    };
    return _objectSpread$2(_objectSpread$2({}, viewBox), {}, {
      value: entry.value,
      payload: entry.payload,
      parentViewBox: entry.parentViewBox,
      viewBox,
      fill: entry.fill
    });
  });
  return /*#__PURE__*/reactExports.createElement(CartesianLabelListContextProvider, {
    value: showLabels ? labelListEntries : undefined
  }, children);
}
function BarRectangleWithActiveState(props) {
  var {
    shape,
    activeBar,
    baseProps,
    entry,
    index,
    dataKey
  } = props;
  var activeIndex = useAppSelector(selectActiveTooltipIndex);
  var activeDataKey = useAppSelector(selectActiveTooltipDataKey);
  /*
   * Bars support stacking, meaning that there can be multiple bars at the same x value.
   * With Tooltip shared=false we only want to highlight the currently active Bar, not all.
   *
   * Also, if the tooltip is shared, we want to highlight all bars at the same x value
   * regardless of the dataKey.
   *
   * With shared Tooltip, the activeDataKey is undefined.
   */
  var isActive = activeBar && String(index) === activeIndex && (activeDataKey == null || dataKey === activeDataKey);
  var option = isActive ? activeBar : shape;
  if (isActive) {
    return /*#__PURE__*/reactExports.createElement(ZIndexLayer, {
      zIndex: DefaultZIndexes.activeBar
    }, /*#__PURE__*/reactExports.createElement(BarRectangle, _extends$1({}, baseProps, {
      name: String(baseProps.name)
    }, entry, {
      isActive: isActive,
      option: option,
      index: index,
      dataKey: dataKey
    })));
  }
  return /*#__PURE__*/reactExports.createElement(BarRectangle, _extends$1({}, baseProps, {
    name: String(baseProps.name)
  }, entry, {
    isActive: isActive,
    option: option,
    index: index,
    dataKey: dataKey
  }));
}
function BarRectangleNeverActive(props) {
  var {
    shape,
    baseProps,
    entry,
    index,
    dataKey
  } = props;
  return /*#__PURE__*/reactExports.createElement(BarRectangle, _extends$1({}, baseProps, {
    name: String(baseProps.name)
  }, entry, {
    isActive: false,
    option: shape,
    index: index,
    dataKey: dataKey
  }));
}
function BarRectangles(_ref3) {
  var _svgPropertiesNoEvent;
  var {
    data,
    props
  } = _ref3;
  var _ref4 = (_svgPropertiesNoEvent = svgPropertiesNoEvents(props)) !== null && _svgPropertiesNoEvent !== void 0 ? _svgPropertiesNoEvent : {},
    {
      id
    } = _ref4,
    baseProps = _objectWithoutProperties$1(_ref4, _excluded3);
  var {
    shape,
    dataKey,
    activeBar
  } = props;
  var {
      onMouseEnter: onMouseEnterFromProps,
      onClick: onItemClickFromProps,
      onMouseLeave: onMouseLeaveFromProps
    } = props,
    restOfAllOtherProps = _objectWithoutProperties$1(props, _excluded4);

  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onMouseEnterFromContext = useMouseEnterItemDispatch(onMouseEnterFromProps, dataKey);
  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onMouseLeaveFromContext = useMouseLeaveItemDispatch(onMouseLeaveFromProps);
  // @ts-expect-error bar mouse events are not compatible with recharts mouse events
  var onClickFromContext = useMouseClickItemDispatch(onItemClickFromProps, dataKey);
  if (!data) {
    return null;
  }
  return /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, data.map((entry, i) => {
    return /*#__PURE__*/reactExports.createElement(Layer
    // https://github.com/recharts/recharts/issues/5415
    , _extends$1({
      key: "rectangle-".concat(entry === null || entry === void 0 ? void 0 : entry.x, "-").concat(entry === null || entry === void 0 ? void 0 : entry.y, "-").concat(entry === null || entry === void 0 ? void 0 : entry.value, "-").concat(i),
      className: "recharts-bar-rectangle"
    }, adaptEventsOfChild(restOfAllOtherProps, entry, i), {
      // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
      onMouseEnter: onMouseEnterFromContext(entry, i)
      // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
      ,
      onMouseLeave: onMouseLeaveFromContext(entry, i)
      // @ts-expect-error BarRectangleItem type definition says it's missing properties, but I can see them present in debugger!
      ,
      onClick: onClickFromContext(entry, i)
    }), activeBar ? /*#__PURE__*/reactExports.createElement(BarRectangleWithActiveState, {
      shape: shape,
      activeBar: activeBar,
      baseProps: baseProps,
      entry: entry,
      index: i,
      dataKey: dataKey
    }) :
    /*#__PURE__*/
    /*
     * If the `activeBar` prop is falsy, then let's call the variant without hooks.
     * Using the `selectActiveTooltipIndex` selector is usually fast
     * but in charts with large-ish amount of data even the few nanoseconds add up to a noticeable jank.
     * If the activeBar is false then we don't need to know which index is active - because we won't use it anyway.
     * So let's just skip the hooks altogether. That way, React can skip rendering the component,
     * and can skip the tree reconciliation for its children too.
     * Because we can't call hooks conditionally, we need to have a separate component for that.
     */
    reactExports.createElement(BarRectangleNeverActive, {
      shape: shape,
      baseProps: baseProps,
      entry: entry,
      index: i,
      dataKey: dataKey
    }));
  }));
}
function RectanglesWithAnimation(_ref5) {
  var {
    props,
    previousRectanglesRef
  } = _ref5;
  var {
    data,
    layout,
    isAnimationActive,
    animationBegin,
    animationDuration,
    animationEasing,
    onAnimationEnd,
    onAnimationStart
  } = props;
  var prevData = previousRectanglesRef.current;
  var animationId = useAnimationId(props, 'recharts-bar-');
  var [isAnimating, setIsAnimating] = reactExports.useState(false);
  var showLabels = !isAnimating;
  var handleAnimationEnd = reactExports.useCallback(() => {
    if (typeof onAnimationEnd === 'function') {
      onAnimationEnd();
    }
    setIsAnimating(false);
  }, [onAnimationEnd]);
  var handleAnimationStart = reactExports.useCallback(() => {
    if (typeof onAnimationStart === 'function') {
      onAnimationStart();
    }
    setIsAnimating(true);
  }, [onAnimationStart]);
  return /*#__PURE__*/reactExports.createElement(BarLabelListProvider, {
    showLabels: showLabels,
    rects: data
  }, /*#__PURE__*/reactExports.createElement(JavascriptAnimate, {
    animationId: animationId,
    begin: animationBegin,
    duration: animationDuration,
    isActive: isAnimationActive,
    easing: animationEasing,
    onAnimationEnd: handleAnimationEnd,
    onAnimationStart: handleAnimationStart,
    key: animationId
  }, t => {
    var stepData = t === 1 ? data : data === null || data === void 0 ? void 0 : data.map((entry, index) => {
      var prev = prevData && prevData[index];
      if (prev) {
        return _objectSpread$2(_objectSpread$2({}, entry), {}, {
          x: interpolate(prev.x, entry.x, t),
          y: interpolate(prev.y, entry.y, t),
          width: interpolate(prev.width, entry.width, t),
          height: interpolate(prev.height, entry.height, t)
        });
      }
      if (layout === 'horizontal') {
        var height = interpolate(0, entry.height, t);
        var y = interpolate(entry.stackedBarStart, entry.y, t);
        return _objectSpread$2(_objectSpread$2({}, entry), {}, {
          y,
          height
        });
      }
      var w = interpolate(0, entry.width, t);
      var x = interpolate(entry.stackedBarStart, entry.x, t);
      return _objectSpread$2(_objectSpread$2({}, entry), {}, {
        width: w,
        x
      });
    });
    if (t > 0) {
      // eslint-disable-next-line no-param-reassign
      previousRectanglesRef.current = stepData !== null && stepData !== void 0 ? stepData : null;
    }
    if (stepData == null) {
      return null;
    }
    return /*#__PURE__*/reactExports.createElement(Layer, null, /*#__PURE__*/reactExports.createElement(BarRectangles, {
      props: props,
      data: stepData
    }));
  }), /*#__PURE__*/reactExports.createElement(LabelListFromLabelProp, {
    label: props.label
  }), props.children);
}
function RenderRectangles(props) {
  var previousRectanglesRef = reactExports.useRef(null);
  return /*#__PURE__*/reactExports.createElement(RectanglesWithAnimation, {
    previousRectanglesRef: previousRectanglesRef,
    props: props
  });
}
var defaultMinPointSize = 0;
var errorBarDataPointFormatter = (dataPoint, dataKey) => {
  /**
   * if the value coming from `selectBarRectangles` is an array then this is a stacked bar chart.
   * arr[1] represents end value of the bar since the data is in the form of [startValue, endValue].
   * */
  var value = Array.isArray(dataPoint.value) ? dataPoint.value[1] : dataPoint.value;
  return {
    x: dataPoint.x,
    y: dataPoint.y,
    value,
    // @ts-expect-error getValueByDataKey does not validate the output type
    errorVal: getValueByDataKey(dataPoint, dataKey)
  };
};
class BarWithState extends reactExports.PureComponent {
  render() {
    var {
      hide,
      data,
      dataKey,
      className,
      xAxisId,
      yAxisId,
      needClip,
      background,
      id
    } = this.props;
    if (hide || data == null) {
      return null;
    }
    var layerClass = clsx('recharts-bar', className);
    var clipPathId = id;
    return /*#__PURE__*/reactExports.createElement(Layer, {
      className: layerClass,
      id: id
    }, needClip && /*#__PURE__*/reactExports.createElement("defs", null, /*#__PURE__*/reactExports.createElement(GraphicalItemClipPath, {
      clipPathId: clipPathId,
      xAxisId: xAxisId,
      yAxisId: yAxisId
    })), /*#__PURE__*/reactExports.createElement(Layer, {
      className: "recharts-bar-rectangles",
      clipPath: needClip ? "url(#clipPath-".concat(clipPathId, ")") : undefined
    }, /*#__PURE__*/reactExports.createElement(BarBackground, {
      data: data,
      dataKey: dataKey,
      background: background,
      allOtherBarProps: this.props
    }), /*#__PURE__*/reactExports.createElement(RenderRectangles, this.props)));
  }
}
var defaultBarProps = {
  activeBar: false,
  animationBegin: 0,
  animationDuration: 400,
  animationEasing: 'ease',
  background: false,
  hide: false,
  isAnimationActive: 'auto',
  label: false,
  legendType: 'rect',
  minPointSize: defaultMinPointSize,
  xAxisId: 0,
  yAxisId: 0,
  zIndex: DefaultZIndexes.bar
};
function BarImpl(props) {
  var {
    xAxisId,
    yAxisId,
    hide,
    legendType,
    minPointSize,
    activeBar,
    animationBegin,
    animationDuration,
    animationEasing,
    isAnimationActive
  } = props;
  var {
    needClip
  } = useNeedsClip(xAxisId, yAxisId);
  var layout = useChartLayout();
  var isPanorama = useIsPanorama();
  var cells = findAllByType(props.children, Cell);
  var rects = useAppSelector(state => selectBarRectangles(state, xAxisId, yAxisId, isPanorama, props.id, cells));
  if (layout !== 'vertical' && layout !== 'horizontal') {
    return null;
  }
  var errorBarOffset;
  var firstDataPoint = rects === null || rects === void 0 ? void 0 : rects[0];
  if (firstDataPoint == null || firstDataPoint.height == null || firstDataPoint.width == null) {
    errorBarOffset = 0;
  } else {
    errorBarOffset = layout === 'vertical' ? firstDataPoint.height / 2 : firstDataPoint.width / 2;
  }
  return /*#__PURE__*/reactExports.createElement(SetErrorBarContext, {
    xAxisId: xAxisId,
    yAxisId: yAxisId,
    data: rects,
    dataPointFormatter: errorBarDataPointFormatter,
    errorBarOffset: errorBarOffset
  }, /*#__PURE__*/reactExports.createElement(BarWithState, _extends$1({}, props, {
    layout: layout,
    needClip: needClip,
    data: rects,
    xAxisId: xAxisId,
    yAxisId: yAxisId,
    hide: hide,
    legendType: legendType,
    minPointSize: minPointSize,
    activeBar: activeBar,
    animationBegin: animationBegin,
    animationDuration: animationDuration,
    animationEasing: animationEasing,
    isAnimationActive: isAnimationActive
  })));
}
function computeBarRectangles(_ref6) {
  var {
    layout,
    barSettings: {
      dataKey,
      minPointSize: minPointSizeProp
    },
    pos,
    bandSize,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    stackedData,
    displayedData,
    offset,
    cells,
    parentViewBox,
    dataStartIndex
  } = _ref6;
  var numericAxis = layout === 'horizontal' ? yAxis : xAxis;
  // @ts-expect-error this assumes that the domain is always numeric, but doesn't check for it
  var stackedDomain = stackedData ? numericAxis.scale.domain() : null;
  var baseValue = getBaseValueOfBar({
    numericAxis
  });
  var stackedBarStart = numericAxis.scale(baseValue);
  return displayedData.map((entry, index) => {
    var value, x, y, width, height, background;
    if (stackedData) {
      // Use dataStartIndex to access the correct element in the full stackedData array
      value = truncateByDomain(stackedData[index + dataStartIndex], stackedDomain);
    } else {
      value = getValueByDataKey(entry, dataKey);
      if (!Array.isArray(value)) {
        value = [baseValue, value];
      }
    }
    var minPointSize = minPointSizeCallback(minPointSizeProp, defaultMinPointSize)(value[1], index);
    if (layout === 'horizontal') {
      var _ref7;
      var [baseValueScale, currentValueScale] = [yAxis.scale(value[0]), yAxis.scale(value[1])];
      x = getCateCoordinateOfBar({
        axis: xAxis,
        ticks: xAxisTicks,
        bandSize,
        offset: pos.offset,
        entry,
        index
      });
      y = (_ref7 = currentValueScale !== null && currentValueScale !== void 0 ? currentValueScale : baseValueScale) !== null && _ref7 !== void 0 ? _ref7 : undefined;
      width = pos.size;
      var computedHeight = baseValueScale - currentValueScale;
      height = isNan(computedHeight) ? 0 : computedHeight;
      background = {
        x,
        y: offset.top,
        width,
        height: offset.height
      };
      if (Math.abs(minPointSize) > 0 && Math.abs(height) < Math.abs(minPointSize)) {
        var delta = mathSign(height || minPointSize) * (Math.abs(minPointSize) - Math.abs(height));
        y -= delta;
        height += delta;
      }
    } else {
      var [_baseValueScale, _currentValueScale] = [xAxis.scale(value[0]), xAxis.scale(value[1])];
      x = _baseValueScale;
      y = getCateCoordinateOfBar({
        axis: yAxis,
        ticks: yAxisTicks,
        bandSize,
        offset: pos.offset,
        entry,
        index
      });
      width = _currentValueScale - _baseValueScale;
      height = pos.size;
      background = {
        x: offset.left,
        y,
        width: offset.width,
        height
      };
      if (Math.abs(minPointSize) > 0 && Math.abs(width) < Math.abs(minPointSize)) {
        var _delta = mathSign(width || minPointSize) * (Math.abs(minPointSize) - Math.abs(width));
        width += _delta;
      }
    }
    if (x == null || y == null || width == null || height == null) {
      return null;
    }
    var barRectangleItem = _objectSpread$2(_objectSpread$2({}, entry), {}, {
      stackedBarStart,
      x,
      y,
      width,
      height,
      value: stackedData ? value : value[1],
      payload: entry,
      background,
      tooltipPosition: {
        x: x + width / 2,
        y: y + height / 2
      },
      parentViewBox
    }, cells && cells[index] && cells[index].props);
    return barRectangleItem;
  }).filter(Boolean);
}
function BarFn(outsideProps) {
  var props = resolveDefaultProps(outsideProps, defaultBarProps);
  var isPanorama = useIsPanorama();
  // Report all props to Redux store first, before calling any hooks, to avoid circular dependencies.
  return /*#__PURE__*/reactExports.createElement(RegisterGraphicalItemId, {
    id: props.id,
    type: "bar"
  }, id => /*#__PURE__*/reactExports.createElement(reactExports.Fragment, null, /*#__PURE__*/reactExports.createElement(SetLegendPayload, {
    legendPayload: computeLegendPayloadFromBarData(props)
  }), /*#__PURE__*/reactExports.createElement(SetBarTooltipEntrySettings, {
    dataKey: props.dataKey,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    fill: props.fill,
    name: props.name,
    hide: props.hide,
    unit: props.unit,
    tooltipType: props.tooltipType
  }), /*#__PURE__*/reactExports.createElement(SetCartesianGraphicalItem, {
    type: "bar",
    id: id
    // Bar does not allow setting data directly on the graphical item (why?)
    ,
    data: undefined,
    xAxisId: props.xAxisId,
    yAxisId: props.yAxisId,
    zAxisId: 0,
    dataKey: props.dataKey,
    stackId: getNormalizedStackId(props.stackId),
    hide: props.hide,
    barSize: props.barSize,
    minPointSize: props.minPointSize,
    maxBarSize: props.maxBarSize,
    isPanorama: isPanorama
  }), /*#__PURE__*/reactExports.createElement(ZIndexLayer, {
    zIndex: props.zIndex
  }, /*#__PURE__*/reactExports.createElement(BarImpl, _extends$1({}, props, {
    id: id
  })))));
}
var Bar = /*#__PURE__*/reactExports.memo(BarFn, propsAreEqual);
Bar.displayName = 'Bar';

function ownKeys$1(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread$1(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys$1(Object(t), true).forEach(function (r) { _defineProperty$1(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys$1(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty$1(e, r, t) { return (r = _toPropertyKey$1(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey$1(t) { var i = _toPrimitive$1(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive$1(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var pickXAxisId = (_state, xAxisId) => xAxisId;
var pickYAxisId = (_state, _xAxisId, yAxisId) => yAxisId;
var pickIsPanorama = (_state, _xAxisId, _yAxisId, isPanorama) => isPanorama;
var pickBarId = (_state, _xAxisId, _yAxisId, _isPanorama, id) => id;
var selectSynchronisedBarSettings = createSelector([selectUnfilteredCartesianItems, pickBarId], (graphicalItems, id) => graphicalItems.filter(item => item.type === 'bar').find(item => item.id === id));
var selectMaxBarSize = createSelector([selectSynchronisedBarSettings], barSettings => barSettings === null || barSettings === void 0 ? void 0 : barSettings.maxBarSize);
var pickCells = (_state, _xAxisId, _yAxisId, _isPanorama, _id, cells) => cells;
var getBarSize = (globalSize, totalSize, selfSize) => {
  var barSize = selfSize !== null && selfSize !== void 0 ? selfSize : globalSize;
  if (isNullish(barSize)) {
    return undefined;
  }
  return getPercentValue(barSize, totalSize, 0);
};
var selectAllVisibleBars = createSelector([selectChartLayout, selectUnfilteredCartesianItems, pickXAxisId, pickYAxisId, pickIsPanorama], (layout, allItems, xAxisId, yAxisId, isPanorama) => allItems.filter(i => {
  if (layout === 'horizontal') {
    return i.xAxisId === xAxisId;
  }
  return i.yAxisId === yAxisId;
}).filter(i => i.isPanorama === isPanorama).filter(i => i.hide === false).filter(i => i.type === 'bar'));
var selectBarStackGroups = (state, xAxisId, yAxisId, isPanorama) => {
  var layout = selectChartLayout(state);
  if (layout === 'horizontal') {
    return selectStackGroups(state, 'yAxis', yAxisId, isPanorama);
  }
  return selectStackGroups(state, 'xAxis', xAxisId, isPanorama);
};
var selectBarCartesianAxisSize = (state, xAxisId, yAxisId) => {
  var layout = selectChartLayout(state);
  if (layout === 'horizontal') {
    return selectCartesianAxisSize(state, 'xAxis', xAxisId);
  }
  return selectCartesianAxisSize(state, 'yAxis', yAxisId);
};
var combineBarSizeList = (allBars, globalSize, totalSize) => {
  var initialValue = {};
  var stackedBars = allBars.filter(isStacked);
  var unstackedBars = allBars.filter(b => b.stackId == null);
  var groupByStack = stackedBars.reduce((acc, bar) => {
    if (!acc[bar.stackId]) {
      acc[bar.stackId] = [];
    }
    acc[bar.stackId].push(bar);
    return acc;
  }, initialValue);
  var stackedSizeList = Object.entries(groupByStack).map(_ref => {
    var [stackId, bars] = _ref;
    var dataKeys = bars.map(b => b.dataKey);
    var barSize = getBarSize(globalSize, totalSize, bars[0].barSize);
    return {
      stackId,
      dataKeys,
      barSize
    };
  });
  var unstackedSizeList = unstackedBars.map(b => {
    var dataKeys = [b.dataKey].filter(dk => dk != null);
    var barSize = getBarSize(globalSize, totalSize, b.barSize);
    return {
      stackId: undefined,
      dataKeys,
      barSize
    };
  });
  return [...stackedSizeList, ...unstackedSizeList];
};
var selectBarSizeList = createSelector([selectAllVisibleBars, selectRootBarSize, selectBarCartesianAxisSize], combineBarSizeList);
var selectBarBandSize = (state, xAxisId, yAxisId, isPanorama, id) => {
  var _ref2, _getBandSizeOfAxis;
  var barSettings = selectSynchronisedBarSettings(state, xAxisId, yAxisId, isPanorama, id);
  if (barSettings == null) {
    return undefined;
  }
  var layout = selectChartLayout(state);
  var globalMaxBarSize = selectRootMaxBarSize(state);
  var {
    maxBarSize: childMaxBarSize
  } = barSettings;
  var maxBarSize = isNullish(childMaxBarSize) ? globalMaxBarSize : childMaxBarSize;
  var axis, ticks;
  if (layout === 'horizontal') {
    axis = selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
  }
  return (_ref2 = (_getBandSizeOfAxis = getBandSizeOfAxis(axis, ticks, true)) !== null && _getBandSizeOfAxis !== void 0 ? _getBandSizeOfAxis : maxBarSize) !== null && _ref2 !== void 0 ? _ref2 : 0;
};
var selectAxisBandSize = (state, xAxisId, yAxisId, isPanorama) => {
  var layout = selectChartLayout(state);
  var axis, ticks;
  if (layout === 'horizontal') {
    axis = selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
  } else {
    axis = selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
    ticks = selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
  }
  return getBandSizeOfAxis(axis, ticks);
};
function getBarPositions(barGap, barCategoryGap, bandSize, sizeList, maxBarSize) {
  var len = sizeList.length;
  if (len < 1) {
    return undefined;
  }
  var realBarGap = getPercentValue(barGap, bandSize, 0, true);
  var result;
  var initialValue = [];

  // whether is barSize set by user
  // Okay but why does it check only for the first element? What if the first element is set but others are not?
  if (isWellBehavedNumber(sizeList[0].barSize)) {
    var useFull = false;
    var fullBarSize = bandSize / len;
    var sum = sizeList.reduce((res, entry) => res + (entry.barSize || 0), 0);
    sum += (len - 1) * realBarGap;
    if (sum >= bandSize) {
      sum -= (len - 1) * realBarGap;
      realBarGap = 0;
    }
    if (sum >= bandSize && fullBarSize > 0) {
      useFull = true;
      fullBarSize *= 0.9;
      sum = len * fullBarSize;
    }
    var offset = (bandSize - sum) / 2 >> 0;
    var prev = {
      offset: offset - realBarGap,
      size: 0
    };
    result = sizeList.reduce((res, entry) => {
      var _entry$barSize;
      var newPosition = {
        stackId: entry.stackId,
        dataKeys: entry.dataKeys,
        position: {
          offset: prev.offset + prev.size + realBarGap,
          size: useFull ? fullBarSize : (_entry$barSize = entry.barSize) !== null && _entry$barSize !== void 0 ? _entry$barSize : 0
        }
      };
      var newRes = [...res, newPosition];
      prev = newRes[newRes.length - 1].position;
      return newRes;
    }, initialValue);
  } else {
    var _offset = getPercentValue(barCategoryGap, bandSize, 0, true);
    if (bandSize - 2 * _offset - (len - 1) * realBarGap <= 0) {
      realBarGap = 0;
    }
    var originalSize = (bandSize - 2 * _offset - (len - 1) * realBarGap) / len;
    if (originalSize > 1) {
      originalSize >>= 0;
    }
    var size = isWellBehavedNumber(maxBarSize) ? Math.min(originalSize, maxBarSize) : originalSize;
    result = sizeList.reduce((res, entry, i) => [...res, {
      stackId: entry.stackId,
      dataKeys: entry.dataKeys,
      position: {
        offset: _offset + (originalSize + realBarGap) * i + (originalSize - size) / 2,
        size
      }
    }], initialValue);
  }
  return result;
}
var combineAllBarPositions = (sizeList, globalMaxBarSize, barGap, barCategoryGap, barBandSize, bandSize, childMaxBarSize) => {
  var maxBarSize = isNullish(childMaxBarSize) ? globalMaxBarSize : childMaxBarSize;
  var allBarPositions = getBarPositions(barGap, barCategoryGap, barBandSize !== bandSize ? barBandSize : bandSize, sizeList, maxBarSize);
  if (barBandSize !== bandSize && allBarPositions != null) {
    allBarPositions = allBarPositions.map(pos => _objectSpread$1(_objectSpread$1({}, pos), {}, {
      position: _objectSpread$1(_objectSpread$1({}, pos.position), {}, {
        offset: pos.position.offset - barBandSize / 2
      })
    }));
  }
  return allBarPositions;
};
var selectAllBarPositions = createSelector([selectBarSizeList, selectRootMaxBarSize, selectBarGap, selectBarCategoryGap, selectBarBandSize, selectAxisBandSize, selectMaxBarSize], combineAllBarPositions);
var selectXAxisWithScale = (state, xAxisId, _yAxisId, isPanorama) => selectAxisWithScale(state, 'xAxis', xAxisId, isPanorama);
var selectYAxisWithScale = (state, _xAxisId, yAxisId, isPanorama) => selectAxisWithScale(state, 'yAxis', yAxisId, isPanorama);
var selectXAxisTicks = (state, xAxisId, _yAxisId, isPanorama) => selectTicksOfGraphicalItem(state, 'xAxis', xAxisId, isPanorama);
var selectYAxisTicks = (state, _xAxisId, yAxisId, isPanorama) => selectTicksOfGraphicalItem(state, 'yAxis', yAxisId, isPanorama);
var selectBarPosition = createSelector([selectAllBarPositions, selectSynchronisedBarSettings], (allBarPositions, barSettings) => {
  if (allBarPositions == null || barSettings == null) {
    return undefined;
  }
  var position = allBarPositions.find(p => p.stackId === barSettings.stackId && barSettings.dataKey != null && p.dataKeys.includes(barSettings.dataKey));
  if (position == null) {
    return undefined;
  }
  return position.position;
});
var combineStackedData = (stackGroups, barSettings) => {
  var stackSeriesIdentifier = getStackSeriesIdentifier(barSettings);
  if (!stackGroups || stackSeriesIdentifier == null || barSettings == null) {
    return undefined;
  }
  var {
    stackId
  } = barSettings;
  if (stackId == null) {
    return undefined;
  }
  var stackGroup = stackGroups[stackId];
  if (!stackGroup) {
    return undefined;
  }
  var {
    stackedData
  } = stackGroup;
  if (!stackedData) {
    return undefined;
  }
  return stackedData.find(sd => sd.key === stackSeriesIdentifier);
};
var selectStackedDataOfItem = createSelector([selectBarStackGroups, selectSynchronisedBarSettings], combineStackedData);
var selectBarRectangles = createSelector([selectChartOffsetInternal, selectAxisViewBox, selectXAxisWithScale, selectYAxisWithScale, selectXAxisTicks, selectYAxisTicks, selectBarPosition, selectChartLayout, selectChartDataWithIndexesIfNotInPanorama, selectAxisBandSize, selectStackedDataOfItem, selectSynchronisedBarSettings, pickCells], (offset, axisViewBox, xAxis, yAxis, xAxisTicks, yAxisTicks, pos, layout, _ref3, bandSize, stackedData, barSettings, cells) => {
  var {
    chartData,
    dataStartIndex,
    dataEndIndex
  } = _ref3;
  if (barSettings == null || pos == null || axisViewBox == null || layout !== 'horizontal' && layout !== 'vertical' || xAxis == null || yAxis == null || xAxisTicks == null || yAxisTicks == null || bandSize == null) {
    return undefined;
  }
  var {
    data
  } = barSettings;
  var displayedData;
  if (data != null && data.length > 0) {
    displayedData = data;
  } else {
    displayedData = chartData === null || chartData === void 0 ? void 0 : chartData.slice(dataStartIndex, dataEndIndex + 1);
  }
  if (displayedData == null) {
    return undefined;
  }
  return computeBarRectangles({
    layout,
    barSettings,
    pos,
    parentViewBox: axisViewBox,
    bandSize,
    xAxis,
    yAxis,
    xAxisTicks,
    yAxisTicks,
    stackedData,
    displayedData,
    offset,
    cells,
    dataStartIndex
  });
});

var allowedTooltipTypes$1 = ['axis', 'item'];
var BarChart = /*#__PURE__*/reactExports.forwardRef((props, ref) => {
  return /*#__PURE__*/reactExports.createElement(CartesianChart, {
    chartName: "BarChart",
    defaultTooltipEventType: "axis",
    validateTooltipEventTypes: allowedTooltipTypes$1,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: props,
    ref: ref
  });
});

function ReportPolarOptions(props) {
  var dispatch = useAppDispatch();
  reactExports.useEffect(() => {
    dispatch(updatePolarOptions(props));
  }, [dispatch, props]);
  return null;
}

var _excluded = ["layout"];
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _objectWithoutProperties(e, t) { if (null == e) return {}; var o, r, i = _objectWithoutPropertiesLoose(e, t); if (Object.getOwnPropertySymbols) { var n = Object.getOwnPropertySymbols(e); for (r = 0; r < n.length; r++) o = n[r], -1 === t.indexOf(o) && {}.propertyIsEnumerable.call(e, o) && (i[o] = e[o]); } return i; }
function _objectWithoutPropertiesLoose(r, e) { if (null == r) return {}; var t = {}; for (var n in r) if ({}.hasOwnProperty.call(r, n)) { if (-1 !== e.indexOf(n)) continue; t[n] = r[n]; } return t; }
var defaultMargin = {
  top: 5,
  right: 5,
  bottom: 5,
  left: 5
};

/**
 * These default props are the same for all PolarChart components.
 */
var defaultPolarChartProps = {
  accessibilityLayer: true,
  stackOffset: 'none',
  barCategoryGap: '10%',
  barGap: 4,
  margin: defaultMargin,
  reverseStackOrder: false,
  syncMethod: 'index',
  layout: 'radial',
  responsive: false,
  cx: '50%',
  cy: '50%',
  innerRadius: 0,
  outerRadius: '80%'
};

/**
 * These props are required for the PolarChart to function correctly.
 * Users usually would not need to specify these explicitly,
 * because the convenience components like PieChart, RadarChart, etc.
 * will provide these defaults.
 * We can't have the defaults in this file because each of those convenience components
 * have their own opinions about what they should be.
 */

/**
 * These are one-time, immutable options that decide the chart's behavior.
 * Users who wish to call CartesianChart may decide to pass these options explicitly,
 * but usually we would expect that they use one of the convenience components like PieChart, RadarChart, etc.
 */

var PolarChart = /*#__PURE__*/reactExports.forwardRef(function PolarChart(props, ref) {
  var _polarChartProps$id;
  var polarChartProps = resolveDefaultProps(props.categoricalChartProps, defaultPolarChartProps);
  var {
      layout
    } = polarChartProps,
    otherCategoricalProps = _objectWithoutProperties(polarChartProps, _excluded);
  var {
    chartName,
    defaultTooltipEventType,
    validateTooltipEventTypes,
    tooltipPayloadSearcher
  } = props;
  var options = {
    chartName,
    defaultTooltipEventType,
    validateTooltipEventTypes,
    tooltipPayloadSearcher,
    eventEmitter: undefined
  };
  return /*#__PURE__*/reactExports.createElement(RechartsStoreProvider, {
    preloadedState: {
      options
    },
    reduxStoreName: (_polarChartProps$id = polarChartProps.id) !== null && _polarChartProps$id !== void 0 ? _polarChartProps$id : chartName
  }, /*#__PURE__*/reactExports.createElement(ChartDataContextProvider, {
    chartData: polarChartProps.data
  }), /*#__PURE__*/reactExports.createElement(ReportMainChartProps, {
    layout: layout,
    margin: polarChartProps.margin
  }), /*#__PURE__*/reactExports.createElement(ReportChartProps, {
    baseValue: undefined,
    accessibilityLayer: polarChartProps.accessibilityLayer,
    barCategoryGap: polarChartProps.barCategoryGap,
    maxBarSize: polarChartProps.maxBarSize,
    stackOffset: polarChartProps.stackOffset,
    barGap: polarChartProps.barGap,
    barSize: polarChartProps.barSize,
    syncId: polarChartProps.syncId,
    syncMethod: polarChartProps.syncMethod,
    className: polarChartProps.className,
    reverseStackOrder: polarChartProps.reverseStackOrder
  }), /*#__PURE__*/reactExports.createElement(ReportPolarOptions, {
    cx: polarChartProps.cx,
    cy: polarChartProps.cy,
    startAngle: polarChartProps.startAngle,
    endAngle: polarChartProps.endAngle,
    innerRadius: polarChartProps.innerRadius,
    outerRadius: polarChartProps.outerRadius
  }), /*#__PURE__*/reactExports.createElement(CategoricalChart, _extends({}, otherCategoricalProps, {
    ref: ref
  })));
});

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), true).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: true, configurable: true, writable: true }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var allowedTooltipTypes = ['item'];
var defaultPieChartProps = _objectSpread(_objectSpread({}, defaultPolarChartProps), {}, {
  layout: 'centric',
  startAngle: 0,
  endAngle: 360
});
var PieChart = /*#__PURE__*/reactExports.forwardRef((props, ref) => {
  var propsWithDefaults = resolveDefaultProps(props, defaultPieChartProps);
  return /*#__PURE__*/reactExports.createElement(PolarChart, {
    chartName: "PieChart",
    defaultTooltipEventType: "item",
    validateTooltipEventTypes: allowedTooltipTypes,
    tooltipPayloadSearcher: arrayTooltipSearcher,
    categoricalChartProps: propsWithDefaults,
    ref: ref
  });
});

const ALL_WIDGETS = [
  { id: "kpis", titulo: "KPIs principais" },
  { id: "vendas_destino", titulo: "Vendas por destino" },
  { id: "vendas_produto", titulo: "Vendas por produto" },
  { id: "timeline", titulo: "Evolução das vendas" },
  { id: "orcamentos", titulo: "Orçamentos recentes" },
  { id: "aniversariantes", titulo: "Aniversariantes" }
];
const ALL_KPIS = [
  { id: "kpi_vendas_total", titulo: "Vendas no período" },
  { id: "kpi_qtd_vendas", titulo: "Qtd. vendas" },
  { id: "kpi_ticket_medio", titulo: "Ticket médio" },
  { id: "kpi_diferenciado", titulo: "Comissão Diferenciada" },
  { id: "kpi_orcamentos", titulo: "Orçamentos" },
  { id: "kpi_conversao", titulo: "Conv. Orç → Vendas" },
  { id: "kpi_meta", titulo: "Meta somada (R$)" },
  { id: "kpi_atingimento", titulo: "Atingimento da meta" }
];
function formatCurrency(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
function getMonthBounds() {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toISO = (d) => d.toISOString().substring(0, 10);
  return { inicio: toISO(start), fim: toISO(end) };
}
function getLastNDaysBounds(n) {
  const end = /* @__PURE__ */ new Date();
  const start = /* @__PURE__ */ new Date();
  start.setDate(end.getDate() - (n - 1));
  const toISO = (d) => d.toISOString().substring(0, 10);
  return { inicio: toISO(start), fim: toISO(end) };
}
function calcularIdade(nascimentoStr) {
  if (!nascimentoStr) return null;
  const nasc = new Date(nascimentoStr);
  if (isNaN(nasc.getTime())) return null;
  const hoje = /* @__PURE__ */ new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || m === 0 && hoje.getDate() < nasc.getDate()) {
    idade--;
  }
  return idade;
}
const COLORS_PURPLE = ["#7c3aed", "#a855f7", "#6366f1", "#ec4899", "#22c55e"];
const DashboardGeralIsland = () => {
  const [userCtx, setUserCtx] = reactExports.useState(null);
  const [loadingUserCtx, setLoadingUserCtx] = reactExports.useState(true);
  const permissaoData = usePermissao("Dashboard");
  const [presetPeriodo, setPresetPeriodo] = reactExports.useState("mes_atual");
  const [inicio, setInicio] = reactExports.useState("");
  const [fim, setFim] = reactExports.useState("");
  const [vendas, setVendas] = reactExports.useState([]);
  const [orcamentos, setOrcamentos] = reactExports.useState([]);
  const [metas, setMetas] = reactExports.useState([]);
  const [clientes, setClientes] = reactExports.useState([]);
  const [loadingDados, setLoadingDados] = reactExports.useState(true);
  const [erro, setErro] = reactExports.useState(null);
  const [widgetOrder, setWidgetOrder] = reactExports.useState(ALL_WIDGETS.map((w) => w.id));
  const [widgetVisible, setWidgetVisible] = reactExports.useState(
    () => ALL_WIDGETS.reduce((acc, w) => ({ ...acc, [w.id]: true }), {})
  );
  const [showCustomize, setShowCustomize] = reactExports.useState(false);
  const [kpiOrder, setKpiOrder] = reactExports.useState(ALL_KPIS.map((k) => k.id));
  const [kpiVisible, setKpiVisible] = reactExports.useState(
    () => ALL_KPIS.reduce((acc, k) => ({ ...acc, [k.id]: true }), {})
  );
  const [chartPrefs, setChartPrefs] = reactExports.useState({
    vendas_destino: "pie",
    vendas_produto: "bar",
    timeline: "line"
  });
  const toggleWidget = (id) => {
    const updated = { ...widgetVisible, [id]: !widgetVisible[id] };
    setWidgetVisible(updated);
    salvarPreferencias(widgetOrder, updated, { order: kpiOrder, visible: kpiVisible });
  };
  const toggleKpi = (id) => {
    const updated = { ...kpiVisible, [id]: !kpiVisible[id] };
    setKpiVisible(updated);
    salvarPreferencias(widgetOrder, widgetVisible, { order: kpiOrder, visible: updated });
  };
  const moverWidget = (id, direction) => {
    const idx = widgetOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...widgetOrder];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
    setWidgetOrder(newOrder);
    salvarPreferencias(newOrder, widgetVisible, { order: kpiOrder, visible: kpiVisible }, chartPrefs);
  };
  const moverKpi = (id, direction) => {
    const idx = kpiOrder.indexOf(id);
    if (idx === -1) return;
    const newOrder = [...kpiOrder];
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= newOrder.length) return;
    [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
    setKpiOrder(newOrder);
    salvarPreferencias(widgetOrder, widgetVisible, { order: newOrder, visible: kpiVisible }, chartPrefs);
  };
  const alterarChart = (widgetId, tipo) => {
    const updated = { ...chartPrefs, [widgetId]: tipo };
    setChartPrefs(updated);
    salvarPreferencias(widgetOrder, widgetVisible, { order: kpiOrder, visible: kpiVisible }, updated);
  };
  const widgetAtivo = (id) => widgetVisible[id] !== false;
  function salvarKpiLocal(order, visible, charts) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "dashboard_kpis",
        JSON.stringify({ order, visible })
      );
      if (charts) {
        window.localStorage.setItem(
          "dashboard_charts",
          JSON.stringify(charts)
        );
      }
    }
  }
  async function salvarPreferencias(order, visible, kpiState, charts) {
    try {
      if (userCtx?.usuarioId) {
        const payload = order.map((id, idx) => ({
          usuario_id: userCtx.usuarioId,
          widget: id,
          ordem: idx,
          visivel: visible[id] !== false,
          // settings opcional para KPIs; se a coluna não existir, fallback localStorage cuidará
          settings: id === "kpis" && kpiState ? {
            kpis: {
              order: kpiState.order,
              visible: kpiState.visible
            },
            charts: charts || null
          } : id === "vendas_destino" || id === "vendas_produto" || id === "timeline" ? {
            charts: charts || null
          } : null
        }));
        await supabase.from("dashboard_widgets").delete().eq("usuario_id", userCtx.usuarioId);
        try {
          await supabase.from("dashboard_widgets").insert(payload);
        } catch (err) {
          const payloadSemSettings = payload.map((p) => {
            const clone = { ...p };
            delete clone.settings;
            return clone;
          });
          await supabase.from("dashboard_widgets").insert(payloadSemSettings);
        }
      }
    } catch (e) {
      console.warn("Não foi possível salvar preferências no Supabase, mantendo localStorage.", e);
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "dashboard_widgets",
          JSON.stringify({ order, visible })
        );
        if (kpiState) {
          salvarKpiLocal(kpiState.order, kpiState.visible, charts);
        }
        if (charts) {
          window.localStorage.setItem("dashboard_charts", JSON.stringify(charts));
        }
      }
    }
  }
  const [orcamentoSelecionado, setOrcamentoSelecionado] = reactExports.useState(null);
  const [clienteSelecionado, setClienteSelecionado] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const { inicio: i, fim: f } = getMonthBounds();
    setInicio(i);
    setFim(f);
    setPresetPeriodo("mes_atual");
  }, []);
  function aplicarPreset(p) {
    setPresetPeriodo(p);
    if (p === "mes_atual") {
      const { inicio: i, fim: f } = getMonthBounds();
      setInicio(i);
      setFim(f);
    } else if (p === "ultimos_30") {
      const { inicio: i, fim: f } = getLastNDaysBounds(30);
      setInicio(i);
      setFim(f);
    }
  }
  reactExports.useEffect(() => {
    async function carregarContexto() {
      try {
        setLoadingUserCtx(true);
        setErro(null);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          setErro("Usuário não autenticado.");
          return;
        }
        const userId = authData.user.id;
        const { data: usuarioDb, error: usuarioErr } = await supabase.from("users").select("id, nome_completo, user_types(name)").eq("id", userId).maybeSingle();
        if (usuarioErr) {
          console.error(usuarioErr);
        }
        const tipoName = usuarioDb?.user_types?.name || authData.user.user_metadata?.name || "";
        const tipoNorm = String(tipoName || "").toUpperCase();
        let papel = "VENDEDOR";
        if (tipoNorm.includes("ADMIN")) papel = "ADMIN";
        else if (tipoNorm.includes("GESTOR")) papel = "GESTOR";
        else if (tipoNorm.includes("VENDEDOR")) papel = "VENDEDOR";
        else papel = "OUTRO";
        let vendedorIds = [userId];
        if (papel === "GESTOR") {
          const { data: rel, error: relErr } = await supabase.from("gestor_vendedor").select("vendedor_id").eq("gestor_id", userId);
          if (!relErr && rel) {
            const extra = rel.map((r) => r.vendedor_id).filter((id) => Boolean(id));
            vendedorIds = Array.from(/* @__PURE__ */ new Set([userId, ...extra]));
          }
        } else if (papel === "ADMIN") {
          vendedorIds = [];
        }
        setUserCtx({
          usuarioId: userId,
          nome: usuarioDb?.nome_completo || null,
          papel,
          vendedorIds
        });
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar contexto do usuário.");
      } finally {
        setLoadingUserCtx(false);
      }
    }
    carregarContexto();
  }, []);
  reactExports.useEffect(() => {
    if (!userCtx || !inicio || !fim) return;
    async function carregarDashboard() {
      try {
        setLoadingDados(true);
        setErro(null);
        let vendasQuery = supabase.from("vendas").select(
          `
          id,
          data_lancamento,
          data_embarque,
          cancelada,
          vendedor_id,
          clientes:clientes (id, nome),
          destinos:destinos (id, nome),
          vendas_recibos (
            id,
            valor_total,
            valor_taxas,
            produtos:produtos (id, nome, regra_comissionamento)
          )
        `
        ).gte("data_lancamento", inicio).lte("data_lancamento", fim).eq("cancelada", false);
        if (userCtx.vendedorIds.length > 0) {
          vendasQuery = vendasQuery.in("vendedor_id", userCtx.vendedorIds);
        }
        const { data: vendasData, error: vendasErr } = await vendasQuery;
        if (vendasErr) throw vendasErr;
        const { data: orcData, error: orcErr } = await supabase.from("orcamentos").select(
          `
          id,
          data_orcamento,
          data_viagem,
          status,
          valor,
          notas,
          clientes:clientes (id, nome),
          destinos:destinos (id, nome)
        `
        ).gte("data_orcamento", inicio).lte("data_orcamento", fim).order("data_orcamento", { ascending: false });
        if (orcErr) throw orcErr;
        let metasQuery = supabase.from("metas_vendedor").select(
          "id, vendedor_id, periodo, meta_geral, meta_diferenciada, ativo"
        ).gte("periodo", inicio).lte("periodo", fim).eq("ativo", true);
        if (userCtx.vendedorIds.length > 0) {
          metasQuery = metasQuery.in("vendedor_id", userCtx.vendedorIds);
        }
        const { data: metasData, error: metasErr } = await metasQuery;
        if (metasErr) throw metasErr;
        const { data: clientesData, error: clientesErr } = await supabase.from("clientes").select("id, nome, nascimento, telefone");
        if (clientesErr) throw clientesErr;
        setVendas(vendasData || []);
        setOrcamentos(orcData || []);
        setMetas(metasData || []);
        setClientes(clientesData || []);
        try {
          const { data: prefData, error: prefErr } = await supabase.from("dashboard_widgets").select("widget, ordem, visivel, settings").eq("usuario_id", userCtx.usuarioId).order("ordem", { ascending: true });
          if (!prefErr && prefData && prefData.length > 0) {
            const ordem = prefData.map((p) => p.widget).filter((id) => ALL_WIDGETS.some((w) => w.id === id));
            const vis = { ...widgetVisible };
            let kpiFromDb = {};
            let chartsFromDb = null;
            prefData.forEach((p) => {
              const id = p.widget;
              if (ALL_WIDGETS.some((w) => w.id === id)) {
                vis[id] = p.visivel !== false;
              }
              if (id === "kpis" && p.settings?.kpis) {
                if (Array.isArray(p.settings.kpis.order)) {
                  kpiFromDb.order = p.settings.kpis.order.filter(
                    (kid) => ALL_KPIS.some((k) => k.id === kid)
                  );
                }
                if (p.settings.kpis.visible) {
                  kpiFromDb.visible = { ...kpiVisible, ...p.settings.kpis.visible };
                }
              }
              if (p.settings?.charts) {
                chartsFromDb = { ...chartsFromDb || {}, ...p.settings.charts };
              }
            });
            if (ordem.length > 0) setWidgetOrder(ordem);
            setWidgetVisible(vis);
            if (kpiFromDb.order && kpiFromDb.order.length > 0) setKpiOrder(kpiFromDb.order);
            if (kpiFromDb.visible) setKpiVisible(kpiFromDb.visible);
            if (chartsFromDb) setChartPrefs((prev) => ({ ...prev, ...chartsFromDb }));
          } else {
            const local = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_widgets") : null;
            if (local) {
              const parsed = JSON.parse(local);
              if (parsed.order && parsed.visible) {
                setWidgetOrder(parsed.order);
                setWidgetVisible(parsed.visible);
              }
            }
            const localKpi = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_kpis") : null;
            if (localKpi) {
              const parsed = JSON.parse(localKpi);
              if (parsed.order) setKpiOrder(parsed.order);
              if (parsed.visible) setKpiVisible(parsed.visible);
            }
            const localCharts = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_charts") : null;
            if (localCharts) {
              const parsed = JSON.parse(localCharts);
              setChartPrefs((prev) => ({ ...prev, ...parsed }));
            }
          }
        } catch (e) {
          console.warn("Preferências do dashboard não carregadas, usando padrão.", e);
          const local = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_widgets") : null;
          if (local) {
            const parsed = JSON.parse(local);
            if (parsed.order && parsed.visible) {
              setWidgetOrder(parsed.order);
              setWidgetVisible(parsed.visible);
            }
          }
          const localKpi = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_kpis") : null;
          if (localKpi) {
            const parsed = JSON.parse(localKpi);
            if (parsed.order) setKpiOrder(parsed.order);
            if (parsed.visible) setKpiVisible(parsed.visible);
          }
          const localCharts = typeof window !== "undefined" ? window.localStorage.getItem("dashboard_charts") : null;
          if (localCharts) {
            const parsed = JSON.parse(localCharts);
            setChartPrefs((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar dados do dashboard.");
      } finally {
        setLoadingDados(false);
      }
    }
    carregarDashboard();
  }, [userCtx, inicio, fim]);
  const {
    totalVendas,
    qtdVendas,
    ticketMedio,
    totalDiferenciado,
    totalOrcamentos,
    conversao,
    metaSomada,
    atingimentoMeta
  } = reactExports.useMemo(() => {
    let totalVendas2 = 0;
    let qtdVendas2 = vendas.length;
    let totalDiferenciado2 = 0;
    vendas.forEach((v) => {
      const recibos = v.vendas_recibos || [];
      let somaVenda = 0;
      recibos.forEach((r) => {
        const valor = Number(r.valor_total || 0);
        somaVenda += valor;
        const regra = r.produtos?.regra_comissionamento?.toLowerCase() || "";
        if (regra === "diferenciado") {
          totalDiferenciado2 += valor;
        }
      });
      totalVendas2 += somaVenda;
    });
    const ticketMedio2 = qtdVendas2 > 0 ? totalVendas2 / qtdVendas2 : 0;
    const totalOrcamentos2 = orcamentos.length;
    const conversao2 = totalOrcamentos2 > 0 ? qtdVendas2 / totalOrcamentos2 * 100 : 0;
    const metaSomada2 = metas.reduce(
      (acc, m) => acc + Number(m.meta_geral || 0),
      0
    );
    const atingimentoMeta2 = metaSomada2 > 0 ? totalVendas2 / metaSomada2 * 100 : 0;
    return {
      totalVendas: totalVendas2,
      qtdVendas: qtdVendas2,
      ticketMedio: ticketMedio2,
      totalDiferenciado: totalDiferenciado2,
      totalOrcamentos: totalOrcamentos2,
      conversao: conversao2,
      metaSomada: metaSomada2,
      atingimentoMeta: atingimentoMeta2
    };
  }, [vendas, orcamentos, metas]);
  const vendasPorDestino = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    vendas.forEach((v) => {
      const destino = v.destinos?.nome || "Sem destino";
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      map.set(destino, (map.get(destino) || 0) + totalVenda);
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [vendas]);
  const vendasPorProduto = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    vendas.forEach((v) => {
      (v.vendas_recibos || []).forEach((r) => {
        const nomeProd = r.produtos?.nome || "Sem produto";
        const valor = Number(r.valor_total || 0);
        map.set(nomeProd, (map.get(nomeProd) || 0) + valor);
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [vendas]);
  const vendasTimeline = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    vendas.forEach((v) => {
      const dia = v.data_lancamento;
      const totalVenda = (v.vendas_recibos || []).reduce(
        (acc, r) => acc + Number(r.valor_total || 0),
        0
      );
      map.set(dia, (map.get(dia) || 0) + totalVenda);
    });
    const arr = Array.from(map.entries()).sort(([a], [b]) => a < b ? -1 : 1).map(([date, value]) => {
      const d = new Date(date);
      const label = isNaN(d.getTime()) ? date : d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit"
      });
      return { date, label, value };
    });
    return arr;
  }, [vendas]);
  const orcamentosRecentes = reactExports.useMemo(() => {
    const sorted = [...orcamentos].sort(
      (a, b) => a.data_orcamento < b.data_orcamento ? 1 : -1
    );
    return sorted.slice(0, 10);
  }, [orcamentos]);
  const aniversariantesMes = reactExports.useMemo(() => {
    const hoje = /* @__PURE__ */ new Date();
    const mesAtual = hoje.getMonth();
    return clientes.filter((c) => {
      if (!c.nascimento) return false;
      const d = new Date(c.nascimento);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === mesAtual;
    });
  }, [clientes]);
  if (loadingUserCtx && !userCtx || permissaoData.loading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Carregando contexto do dashboard..." });
  }
  if (!permissaoData.ativo) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Você não possui acesso ao módulo de Dashboard." });
  }
  const renderWidget = (id) => {
    switch (id) {
      case "kpis":
        return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "card-base card-purple mb-3", style: { paddingBottom: 12 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10
            },
            children: kpiOrder.filter((id2) => kpiVisible[id2] !== false).map((id2) => {
              switch (id2) {
                case "kpi_vendas_total":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Vendas no período" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(totalVendas) })
                      ]
                    },
                    id2
                  );
                case "kpi_qtd_vendas":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Qtd. vendas" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: qtdVendas })
                      ]
                    },
                    id2
                  );
                case "kpi_ticket_medio":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Ticket médio" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(ticketMedio) })
                      ]
                    },
                    id2
                  );
                case "kpi_diferenciado":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Comissão Diferenciada" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(totalDiferenciado) })
                      ]
                    },
                    id2
                  );
                case "kpi_orcamentos":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Orçamentos" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: totalOrcamentos })
                      ]
                    },
                    id2
                  );
                case "kpi_conversao":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Conv. Orç → Vendas" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", children: [
                          conversao.toFixed(1),
                          "%"
                        ] })
                      ]
                    },
                    id2
                  );
                case "kpi_meta":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Meta somada (R$)" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-value", children: formatCurrency(metaSomada) })
                      ]
                    },
                    id2
                  );
                case "kpi_atingimento":
                  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                    "div",
                    {
                      className: "kpi-card",
                      style: { display: "flex", flexDirection: "column", gap: 4 },
                      children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "kpi-label", children: "Atingimento da meta" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "kpi-value", children: [
                          atingimentoMeta.toFixed(1),
                          "%"
                        ] })
                      ]
                    },
                    id2
                  );
                default:
                  return null;
              }
            })
          }
        ) });
      case "vendas_destino":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Vendas por destino" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                style: { maxWidth: 160 },
                value: chartPrefs.vendas_destino || "pie",
                onChange: (e) => alterarChart("vendas_destino", e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pie", children: "Pizza" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bar", children: "Barras" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: "100%", height: 260 }, children: vendasPorDestino.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem" }, children: "Sem dados para o período." }) : chartPrefs.vendas_destino === "bar" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: vendasPorDestino, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "name", hide: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "value", children: vendasPorDestino.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS_PURPLE[index % COLORS_PURPLE.length] }, `cell-dest-${index}`)) })
          ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Pie,
              {
                data: vendasPorDestino,
                dataKey: "value",
                nameKey: "name",
                outerRadius: 90,
                label: (entry) => `${entry.name} (${formatCurrency(entry.value)})`,
                children: vendasPorDestino.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS_PURPLE[index % COLORS_PURPLE.length] }, `cell-${index}`))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) })
          ] }) }) })
        ] });
      case "vendas_produto":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Vendas por produto" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                style: { maxWidth: 160 },
                value: chartPrefs.vendas_produto || "bar",
                onChange: (e) => alterarChart("vendas_produto", e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bar", children: "Barras" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pie", children: "Pizza" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: "100%", height: 260 }, children: vendasPorProduto.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem" }, children: "Sem dados para o período." }) : chartPrefs.vendas_produto === "pie" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(PieChart, { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Pie,
              {
                data: vendasPorProduto,
                dataKey: "value",
                nameKey: "name",
                outerRadius: 90,
                label: (entry) => `${entry.name} (${formatCurrency(entry.value)})`,
                children: vendasPorProduto.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS_PURPLE[index % COLORS_PURPLE.length] }, `cell-prod-pie-${index}`))
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) })
          ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: vendasPorProduto, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "name", hide: true }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "value", children: vendasPorProduto.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS_PURPLE[index % COLORS_PURPLE.length] }, `cell-prod-${index}`)) })
          ] }) }) })
        ] });
      case "timeline":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginBottom: 8 }, children: "Evolução das vendas no período" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "form-select",
                style: { maxWidth: 160 },
                value: chartPrefs.timeline || "line",
                onChange: (e) => alterarChart("timeline", e.target.value),
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "line", children: "Linha" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "bar", children: "Barras" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: "100%", height: 260 }, children: vendasTimeline.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: "0.9rem" }, children: "Sem dados para o período." }) : chartPrefs.timeline === "bar" ? /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(BarChart, { data: vendasTimeline, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "label" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Bar, { dataKey: "value", children: vendasTimeline.map((entry, index) => /* @__PURE__ */ jsxRuntimeExports.jsx(Cell, { fill: COLORS_PURPLE[index % COLORS_PURPLE.length] }, `cell-time-${index}`)) })
          ] }) }) : /* @__PURE__ */ jsxRuntimeExports.jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs(LineChart, { data: vendasTimeline, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(XAxis, { dataKey: "label" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(YAxis, {}),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Tooltip, { formatter: (value) => formatCurrency(Number(value || 0)) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Line, { type: "monotone", dataKey: "value", stroke: "#a855f7", strokeWidth: 2, dot: false })
          ] }) }) })
        ] });
      case "orcamentos":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { style: { marginBottom: 8 }, children: [
            "Orçamentos recentes (",
            orcamentosRecentes.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[680px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Cliente" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Destino" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Valor" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ver" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              orcamentosRecentes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 6, children: "Nenhum orçamento no período." }) }),
              orcamentosRecentes.map((o) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.data_orcamento ? new Date(o.data_orcamento).toLocaleDateString("pt-BR") : "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.clientes?.nome || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.destinos?.nome || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: o.status || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: formatCurrency(Number(o.valor || 0)) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", onClick: () => setOrcamentoSelecionado(o), children: "Ver" }) })
              ] }, o.id))
            ] })
          ] }) })
        ] });
      case "aniversariantes":
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { style: { marginBottom: 8 }, children: [
            "Aniversariantes do mês (",
            aniversariantesMes.length,
            ")"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "table-container overflow-x-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "table-default min-w-[520px]", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Nome" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Data nasc." }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Idade" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Telefone" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { children: "Ver" })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              aniversariantesMes.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 5, children: "Nenhum aniversariante este mês." }) }),
              aniversariantesMes.map((c) => {
                const idade = calcularIdade(c.nascimento);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nome }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.nascimento ? new Date(c.nascimento).toLocaleDateString("pt-BR") : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: idade ?? "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: c.telefone || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", onClick: () => setClienteSelecionado(c), children: "Ver" }) })
                ] }, c.id);
              })
            ] })
          ] }) })
        ] });
      default:
        return null;
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "dashboard-geral-page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card-base card-purple mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          style: {
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8
          },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                style: {
                  backgroundColor: presetPeriodo === "mes_atual" ? "#4f46e5" : void 0,
                  color: presetPeriodo === "mes_atual" ? "#e5e7eb" : void 0
                },
                onClick: () => aplicarPreset("mes_atual"),
                children: "Mês atual"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                style: {
                  backgroundColor: presetPeriodo === "ultimos_30" ? "#4f46e5" : void 0,
                  color: presetPeriodo === "ultimos_30" ? "#e5e7eb" : void 0
                },
                onClick: () => aplicarPreset("ultimos_30"),
                children: "Últimos 30 dias"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-light",
                style: {
                  backgroundColor: presetPeriodo === "personalizado" ? "#4f46e5" : void 0,
                  color: presetPeriodo === "personalizado" ? "#e5e7eb" : void 0
                },
                onClick: () => setPresetPeriodo("personalizado"),
                children: "Personalizado"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                className: "btn btn-primary",
                onClick: () => setShowCustomize(true),
                children: "Personalizar dashboard"
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data início" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: inicio,
              onChange: (e) => {
                setPresetPeriodo("personalizado");
                setInicio(e.target.value);
              }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "form-group", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "form-label", children: "Data fim" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              value: fim,
              onChange: (e) => {
                setPresetPeriodo("personalizado");
                setFim(e.target.value);
              }
            }
          )
        ] })
      ] })
    ] }),
    widgetAtivo("kpis") && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: renderWidget("kpis") }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 12,
          alignItems: "start"
        },
        children: widgetOrder.filter((id) => ["vendas_destino", "vendas_produto", "timeline"].includes(id) && widgetAtivo(id)).map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: renderWidget(id) }, id))
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 12,
          alignItems: "start"
        },
        children: widgetOrder.filter((id) => ["orcamentos", "aniversariantes"].includes(id) && widgetAtivo(id)).map((id) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: renderWidget(id) }, id))
      }
    ),
    showCustomize && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 60
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              width: "95%",
              maxWidth: 520,
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: 10,
              padding: 16,
              color: "#e5e7eb",
              maxHeight: "90vh",
              overflowY: "auto"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    alignItems: "center"
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Personalizar dashboard" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-light", onClick: () => setShowCustomize(false), children: "Fechar" })
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: widgetOrder.map((id, idx) => {
                const meta = ALL_WIDGETS.find((w) => w.id === id);
                if (!meta) return null;
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    style: {
                      border: "1px solid #1f2937",
                      borderRadius: 8,
                      padding: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexDirection: "column"
                    },
                    children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", width: "100%", gap: 8 }, children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "checkbox",
                            checked: widgetAtivo(id),
                            onChange: () => toggleWidget(id)
                          }
                        ),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1 }, children: meta.titulo }),
                        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              className: "btn btn-light",
                              onClick: () => moverWidget(id, "up"),
                              disabled: idx === 0,
                              children: "↑"
                            }
                          ),
                          /* @__PURE__ */ jsxRuntimeExports.jsx(
                            "button",
                            {
                              type: "button",
                              className: "btn btn-light",
                              onClick: () => moverWidget(id, "down"),
                              disabled: idx === widgetOrder.length - 1,
                              children: "↓"
                            }
                          )
                        ] })
                      ] }),
                      id === "kpis" && widgetAtivo(id) && /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "div",
                        {
                          style: {
                            width: "100%",
                            borderTop: "1px solid #1f2937",
                            paddingTop: 8,
                            marginTop: 8,
                            display: "flex",
                            flexDirection: "column",
                            gap: 8
                          },
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, fontSize: "0.9rem" }, children: "KPIs visíveis e ordem" }),
                            kpiOrder.map((kid, kidx) => {
                              const metaKpi = ALL_KPIS.find((k) => k.id === kid);
                              if (!metaKpi) return null;
                              return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                                "div",
                                {
                                  style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  },
                                  children: [
                                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                                      "input",
                                      {
                                        type: "checkbox",
                                        checked: kpiVisible[kid] !== false,
                                        onChange: () => toggleKpi(kid)
                                      }
                                    ),
                                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1 }, children: metaKpi.titulo }),
                                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        "button",
                                        {
                                          type: "button",
                                          className: "btn btn-light",
                                          onClick: () => moverKpi(kid, "up"),
                                          disabled: kidx === 0,
                                          children: "↑"
                                        }
                                      ),
                                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                                        "button",
                                        {
                                          type: "button",
                                          className: "btn btn-light",
                                          onClick: () => moverKpi(kid, "down"),
                                          disabled: kidx === kpiOrder.length - 1,
                                          children: "↓"
                                        }
                                      )
                                    ] })
                                  ]
                                },
                                kid
                              );
                            })
                          ]
                        }
                      )
                    ]
                  },
                  id
                );
              }) })
            ]
          }
        )
      }
    ),
    orcamentoSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 50
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              width: "95%",
              maxWidth: 700,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#020617",
              borderRadius: 10,
              border: "1px solid #1f2937",
              padding: 18,
              color: "#e5e7eb"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Detalhes do orçamento" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-light",
                        onClick: () => setOrcamentoSelecionado(null),
                        children: "Fechar"
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Cliente:" }),
                " ",
                orcamentoSelecionado.clientes?.nome || "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Destino:" }),
                " ",
                orcamentoSelecionado.destinos?.nome || "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Data orçamento:" }),
                " ",
                orcamentoSelecionado.data_orcamento ? new Date(
                  orcamentoSelecionado.data_orcamento
                ).toLocaleDateString("pt-BR") : "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Data viagem:" }),
                " ",
                orcamentoSelecionado.data_viagem ? new Date(
                  orcamentoSelecionado.data_viagem
                ).toLocaleDateString("pt-BR") : "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Status:" }),
                " ",
                orcamentoSelecionado.status || "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Valor:" }),
                " ",
                formatCurrency(
                  Number(orcamentoSelecionado.valor || 0)
                )
              ] }),
              orcamentoSelecionado.notas && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { marginTop: 8 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Notas:" }),
                " ",
                orcamentoSelecionado.notas
              ] })
            ]
          }
        )
      }
    ),
    clienteSelecionado && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.75)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 50
        },
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: {
              width: "95%",
              maxWidth: 600,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#020617",
              borderRadius: 10,
              border: "1px solid #1f2937",
              padding: 18,
              color: "#e5e7eb"
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { children: "Dados do cliente" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        className: "btn btn-light",
                        onClick: () => setClienteSelecionado(null),
                        children: "Fechar"
                      }
                    )
                  ]
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Nome:" }),
                " ",
                clienteSelecionado.nome
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Nascimento:" }),
                " ",
                clienteSelecionado.nascimento ? new Date(
                  clienteSelecionado.nascimento
                ).toLocaleDateString("pt-BR") : "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Idade:" }),
                " ",
                calcularIdade(clienteSelecionado.nascimento) ?? "-"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "Telefone:" }),
                " ",
                clienteSelecionado.telefone || "-"
              ] })
            ]
          }
        )
      }
    ),
    loadingDados && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: 12, fontSize: "0.9rem" }, children: "Carregando dados do dashboard..." })
  ] });
};

export { DashboardGeralIsland as D };
