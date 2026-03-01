import React, { useMemo, useState, useEffect, useRef } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import Plotly from 'plotly.js-dist-min';
import * as d3 from 'd3';

const Plot = createPlotlyComponent(Plotly);
import {
  Users, Globe, Languages, TrendingUp, Search, Info, Map as MapIcon,
  BarChart2, PieChart as PieChartIcon, Activity
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import data from './data.json';

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COLORS = ['#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#a78bfa', '#fb7185', '#fb923c', '#2dd4bf'];

const countryMapping = {
  "Iran": "IRN", "Russia": "RUS", "Nigeria": "NGA", "Chad": "TCD", "Azerbaijan": "AZE", "Egypt": "EGY",
  "Myanmar": "MMR", "Bangladesh": "BGD", "Saudi Arabia": "SAU", "Yemen": "YEM", "UAE": "ARE",
  "Qatar": "QAT", "Kuwait": "KWT", "Iraq": "IRQ", "Bahrain": "BHR", "Oman": "OMN", "Tanzania": "TZA",
  "Kenya": "KEN", "Syria": "SYR", "Lebanon": "LBN", "Jordan": "JOR", "Palestine": "PSE", "India": "IND",
  "Bosnia and Herzegovina": "BIH", "Maldives": "MDV", "Afghanistan": "AFG", "Pakistan": "PAK",
  "Sudan": "SDN", "Uzbekistan": "UZB", "China": "CHN", "Turkmenistan": "TKM", "Tajikistan": "TJK",
  "Somalia": "SOM", "Ethiopia": "ETH", "Morocco": "MAR", "Algeria": "DZA", "Tunisia": "TUN",
  "Mali": "MLI", "Senegal": "SEN", "Gambia": "GMB", "Guinea": "GIN", "Kazakhstan": "KAZ",
  "Kyrgyzstan": "KGZ", "Albania": "ALB", "Kosovo": "XKX", "Libya": "LBY", "Turkey": "TUR",
  "Indonesia": "IDN", "Niger": "NER", "Malaysia": "MYS", "Philippines": "PHL", "Thailand": "THA",
  "Sri Lanka": "LKA"
};

// --- D3 Bubble Chart Component ---
const D3BubbleChart = ({ data }) => {
  const svgRef = useRef();
  const tooltipRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const width = 800;
    const height = 500;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);
    svg.selectAll("*").remove();

    const pack = d3.pack()
      .size([width, height])
      .padding(4);

    const root = d3.hierarchy({ children: data })
      .sum(d => d.population);

    const nodes = pack(root).leaves();

    const leaf = svg.selectAll("g")
      .data(nodes)
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    leaf.append("circle")
      .attr("r", 0)
      .attr("fill", (d, i) => COLORS[i % COLORS.length])
      .attr("fill-opacity", 0.7)
      .attr("stroke", d => COLORS[nodes.indexOf(d) % COLORS.length])
      .attr("stroke-width", 2)
      .transition()
      .duration(1000)
      .attr("r", d => d.r);

    leaf.append("text")
      .attr("dy", ".3em")
      .style("text-anchor", "middle")
      .style("font-size", d => Math.min(d.r / 3, 12))
      .style("fill", "#fff")
      .style("pointer-events", "none")
      .style("font-weight", "600")
      .text(d => d.r > 20 ? d.data.ethnicity : "");

    // Add interactivity
    leaf.on("mouseover", function (event, d) {
      d3.select(this).select("circle")
        .transition().duration(200)
        .attr("fill-opacity", 1)
        .attr("stroke-width", 4)
        .attr("stroke", "#fff");

      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <div class="tooltip-header">${d.data.ethnicity}</div>
        <div class="tooltip-row">
          <span class="tooltip-label">Population:</span>
          <span class="tooltip-value">${d.data.population}M</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Region:</span>
          <span class="tooltip-value">${d.data.relation}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">Languages:</span>
          <span class="tooltip-value" style="font-size: 0.75rem">${d.data.languages}</span>
        </div>
      `);
    })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).select("circle")
          .transition().duration(200)
          .attr("fill-opacity", 0.7)
          .attr("stroke-width", 2)
          .attr("stroke", COLORS[nodes.indexOf(d) % COLORS.length]);

        tooltip.transition().duration(200).style("opacity", 0);
      });

  }, [data]);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem' }}>
        <svg ref={svgRef} width="800" height="500" viewBox="0 0 800 500" style={{ maxWidth: '100%', height: 'auto' }} />
      </div>
      <div ref={tooltipRef} className="custom-tooltip"></div>
    </div>
  );
};

const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [mapTooltip, setMapTooltip] = useState({ content: '', x: 0, y: 0, visible: false });

  const stats = useMemo(() => {
    const totalPop = data.reduce((acc, curr) => acc + curr.population, 0);
    const regions = [...new Set(data.map(d => d.relation))];
    const topRegion = regions.reduce((a, b) => {
      const aCount = data.filter(d => d.relation === a).reduce((acc, curr) => acc + curr.population, 0);
      const bCount = data.filter(d => d.relation === b).reduce((acc, curr) => acc + curr.population, 0);
      return aCount > bCount ? a : b;
    });

    return {
      totalPopulation: totalPop.toFixed(1),
      totalEthnicities: data.length,
      regionCount: regions.length,
      topRegion
    };
  }, []);

  // --- Plotly Bar Chart Data ---
  const plotlyBarData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.population - a.population).slice(0, 15);
    return [{
      type: 'bar',
      x: sorted.map(d => d.population),
      y: sorted.map(d => d.ethnicity),
      orientation: 'h',
      marker: {
        color: sorted.map((_, i) => COLORS[i % COLORS.length]),
        line: { color: 'rgba(255,255,255,0.2)', width: 1 }
      },
      hovertemplate: '<b>%{y}</b><br>Population: %{x}M<extra></extra>'
    }];
  }, []);

  // --- Plotly Sunburst Data ---
  const sunburstData = useMemo(() => {
    const labels = ["Muslim Population"];
    const parents = [""];
    const values = [data.reduce((acc, curr) => acc + curr.population, 0)];

    const regions = [...new Set(data.map(d => d.relation))];
    regions.forEach(region => {
      const regionPop = data.filter(d => d.relation === region).reduce((acc, curr) => acc + curr.population, 0);
      labels.push(region);
      parents.push("Muslim Population");
      values.push(regionPop);

      data.filter(d => d.relation === region).forEach(item => {
        labels.push(`${item.ethnicity} (${region})`);
        parents.push(region);
        values.push(item.population);
      });
    });

    return [{
      type: "sunburst",
      labels: labels,
      parents: parents,
      values: values,
      outsidetextfont: { size: 20, color: "#377eb8" },
      leaf: { opacity: 0.4 },
      marker: { line: { width: 2 } },
    }];
  }, []);

  const mapData = useMemo(() => {
    const popByCountry = {};
    const countryNames = {};
    data.forEach(item => {
      // Find all matching countries by checking if the country name exists in the region string
      const matchingCountries = Object.keys(countryMapping).filter(c =>
        item.regions.toLowerCase().includes(c.toLowerCase())
      );

      if (matchingCountries.length > 0) {
        const perCountryPop = item.population / matchingCountries.length;
        matchingCountries.forEach(c => {
          const iso = countryMapping[c];
          popByCountry[iso] = (popByCountry[iso] || 0) + perCountryPop;
          countryNames[iso] = c;
        });
      }
    });

    return Object.entries(popByCountry).reduce((acc, [id, value]) => {
      acc[id] = { name: countryNames[id], population: Number(value.toFixed(1)) };
      return acc;
    }, {});
  }, []);

  const colorScale = scaleLinear()
    .domain([1, 10, 50, 150, 250])
    .range(["#1a2533", "#1e293b", "#0ea5e9", "#4f46e5", "#fbbf24"]);

  const filteredData = data.filter(item =>
    item.ethnicity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.languages.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.relation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const commonLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#94a3b8', family: 'Outfit' },
    margin: { l: 80, r: 20, t: 40, b: 40 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.05)', zeroline: false },
    yaxis: { gridcolor: 'rgba(255,255,255,0.05)', zeroline: false },
    showlegend: false
  };

  return (
    <div className="animate-fade-in">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Muslim Population Insights
        </motion.h1>
        <p className="subtitle">Interactive Data Intelligence & Global Ethnography</p>
      </header>

      <div className="stats-grid">
        <StatCard icon={<Users />} title="Total Population" value={`${stats.totalPopulation}M`} delay={0.1} />
        <StatCard icon={<Globe />} title="Unique Ethnicities" value={stats.totalEthnicities} delay={0.2} />
        <StatCard icon={<TrendingUp />} title="Dominant Group" value={stats.topRegion} delay={0.3} />
        <StatCard icon={<Activity />} title="Regions Analyzed" value={stats.regionCount} delay={0.4} />
      </div>

      <div className="tab-navigation glass" style={{ marginBottom: '2.5rem' }}>
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <BarChart2 size={18} /> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <Activity size={18} /> Deep Analytics (D3)
        </button>
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <MapIcon size={18} /> Heatmap
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              <div className="glass chart-container">
                <div className="section-title"><TrendingUp size={20} color="#38bdf8" /> Population by Ethnicity (Millions)</div>
                <Plot
                  data={plotlyBarData}
                  layout={{ ...commonLayout, height: 450, margin: { l: 120, r: 20, t: 20, b: 40 } }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="glass chart-container">
                <div className="section-title"><PieChartIcon size={20} color="#fbbf24" /> Hierarchical Breakdown</div>
                <Plot
                  data={sunburstData}
                  layout={{ ...commonLayout, height: 450, margin: { l: 0, r: 0, t: 0, b: 0 } }}
                  config={{ responsive: true, displayModeBar: false }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div className="glass chart-container" style={{ marginBottom: '3rem' }}>
              <div className="section-title">
                <Activity size={20} color="#f472b6" /> D3 Force-Directed Bubble Intelligence
              </div>
              <p style={{ color: '#94a3b8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Each bubble represents an ethnic group. Size is proportional to total Muslim population. Hover for details.
              </p>
              <D3BubbleChart data={data} />
            </div>
          </motion.div>
        )}

        {activeTab === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass chart-container" style={{ position: 'relative' }}>
            <div className="section-title"><MapIcon size={20} color="#38bdf8" /> Geographic Concentration (Country-Wise Estimate)</div>
            <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
              <ComposableMap projectionConfig={{ scale: 180, center: [40, 20] }}>
                <ZoomableGroup>
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const iso = geo.properties.ISO_A3 || geo.properties.iso_a3;
                        const countryName = geo.properties.name || geo.properties.NAME || geo.properties.NAME_LONG;
                        const d = mapData[iso];

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={d ? colorScale(d.population) : "#1a2533"}
                            stroke="#0f172a"
                            strokeWidth={0.5}
                            onMouseEnter={(e) => {
                              setMapTooltip({
                                visible: true,
                                x: e.pageX,
                                y: e.pageY,
                                content: `
                                  <div class="tooltip-header">${d ? d.name : countryName}</div>
                                  <div class="tooltip-row">
                                    <span class="tooltip-label">Muslim Pop:</span>
                                    <span class="tooltip-value">${d ? d.population + 'M' : 'N/A in Dataset'}</span>
                                  </div>
                                `
                              });
                            }}
                            onMouseMove={(e) => {
                              setMapTooltip(prev => ({ ...prev, x: e.pageX, y: e.pageY }));
                            }}
                            onMouseLeave={() => {
                              setMapTooltip(prev => ({ ...prev, visible: false }));
                            }}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: "#f0f4f8", outline: "none", cursor: 'pointer', transition: 'all 0.3s' },
                              pressed: { outline: "none" },
                            }}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>
            {mapTooltip.visible && (
              <div
                className="custom-tooltip"
                style={{
                  opacity: 1,
                  position: 'fixed',
                  left: mapTooltip.x + 15,
                  top: mapTooltip.y - 28
                }}
                dangerouslySetInnerHTML={{ __html: mapTooltip.content }}
              />
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, background: '#1a2533', borderRadius: '2px' }}></div> Low</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, background: '#0ea5e9', borderRadius: '2px' }}></div> Medium</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 12, height: 12, background: '#fbbf24', borderRadius: '2px' }}></div> High</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="glass" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="section-title" style={{ margin: 0 }}><Info size={20} color="#38bdf8" /> Detailed Ethnography</div>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Filter datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
        <div className="data-table-container">
          <table>
            <thead>
              <tr>
                <th>Ethnicity</th>
                <th>Primary Language</th>
                <th>Regions</th>
                <th>Relation</th>
                <th>Pop (M)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{item.ethnicity}</td>
                  <td>{item.languages}</td>
                  <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{item.regions}</td>
                  <td><span className={`tag ${item.relation === 'Arab' ? 'tag-region' : ''}`}>{item.relation}</span></td>
                  <td style={{ fontWeight: 700, color: '#38bdf8' }}>{item.population}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon, title, value, delay }) => (
  <motion.div
    className="glass stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
  >
    <div className="stat-icon">{icon}</div>
    <div className="stat-info">
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
  </motion.div>
);

export default App;
