import React, { useState } from 'react';
import courseBreakdownData from '../data/course_breakdown.json';
import LatexText from '../components/LatexText.jsx';
import './ExamAnalysisPage.css';

const timelineData = [
  { year: 2010, q: 110, dur: 180, phase: 'Extenso', desc: 'Evaluación exhaustiva de 3 horas con amplia cobertura de teoría macroeconómica clásica y matemática financiera.' },
  { year: 2011, q: 110, dur: 180, phase: 'Extenso', desc: 'Consolidación del formato clásico de 110 preguntas y alta rigurosidad cuantitativa.' },
  { year: 2013, q: 53, dur: 120, phase: 'Reducido', desc: 'Transición hacia un formato concentrado de 2 horas con alta densidad en econometría inferencial.' },
  { year: 2014, q: 53, dur: 120, phase: 'Reducido', desc: 'Mantenimiento de 53 preguntas enfocadas en análisis de series de tiempo y modelos IS-LM.' },
  { year: 2016, q: 99, dur: 180, phase: 'Expandido', desc: 'Retorno a las 3 horas e incorporación balanceada de microeconomía de juegos y macroeconomía abierta.' },
  { year: 2017, q: 100, dur: 180, phase: 'Expandido', desc: 'Estandarización en 100 preguntas con alto peso en propiedades MELI y modelos VAR.' },
  { year: 2018, q: 100, dur: 180, phase: 'Expandido', desc: 'Mayor énfasis en modelos intertemporales, Ramsey y derivados financieros.' },
  { year: 2019, q: 100, dur: 180, phase: 'Expandido', desc: 'Último examen prepandemia con una evaluación profunda en pruebas de raíz unitaria ADF y cointegración.' },
  { year: 2020, q: 55, dur: 110, phase: 'Moderno', desc: 'Optimización moderna con penalización por respuesta incorrecta (-0.25 pts).' },
  { year: 2023, q: 60, dur: 130, phase: 'Moderno', desc: 'Estabilización pospandemia en 60 preguntas analíticas de alta exigencia.' },
  { year: 2024, q: 60, dur: 130, phase: 'Moderno', desc: 'Diferenciación clara entre los exámenes de Economía y Finanzas.' },
  { year: 2025, q: 60, dur: 150, phase: 'Moderno', desc: 'Ampliación a 150 min (2.5 horas) para resolución de problemas econométricos y financieros.' },
];

export default function ExamAnalysisPage() {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses', 'timeline', 'insights'
  const [selectedCourseKey, setSelectedCourseKey] = useState('macroeconomia');
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedYear, setSelectedYear] = useState(timelineData[timelineData.length - 1]);

  const coursesList = Object.entries(courseBreakdownData);
  const currentCourse = courseBreakdownData[selectedCourseKey] || coursesList[0][1];

  const subtopicKeys = Object.keys(currentCourse.subtopics || {});
  const activeSubtopicKey = selectedSubtopic && currentCourse.subtopics[selectedSubtopic] !== undefined
    ? selectedSubtopic
    : subtopicKeys[0];

  const maxFreq = Math.max(...Object.values(currentCourse.subtopics || {}), 1);

  return (
    <div className="exam-container">
      {/* Editorial Header */}
      <header className="exam-header">
        <span className="exam-badge">Documento de Análisis Académico · CEU BCRP</span>
        <h1 className="exam-title">Estructura Temática y Frecuencia Estadística</h1>
        <p className="exam-subtitle">
          Estudio riguroso y desglose estadístico de los exámenes oficiales del Banco Central de Reserva del Perú (Período 2010 – 2025). Clasificación exhaustiva por materias, frecuencias y resolución teórica.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav className="exam-nav">
        <button
          onClick={() => setActiveTab('courses')}
          className={`nav-tab ${activeTab === 'courses' ? 'active' : ''}`}
        >
          Desglose Temático por Materias
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`nav-tab ${activeTab === 'timeline' ? 'active' : ''}`}
        >
          Serie Histórica (2010 – 2025)
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
        >
          Recomendaciones de Preparación
        </button>
      </nav>

      {/* TAB 1: DESGLOSE POR CURSOS Y TEMAS */}
      {activeTab === 'courses' && (
        <div>
          <div className="section-label">1. Selección de Materia Académica</div>
          <div className="courses-grid">
            {coursesList.map(([key, data]) => {
              const isSelected = selectedCourseKey === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedCourseKey(key);
                    setSelectedSubtopic(null);
                  }}
                  className={`course-card ${isSelected ? 'active' : ''}`}
                >
                  <div>
                    <div className="course-icon">{data.icon}</div>
                    <div className="course-name">{data.title}</div>
                  </div>
                  <div className="course-meta">{data.total_questions} preguntas</div>
                </button>
              );
            })}
          </div>

          <div className="section-label">2. Banco de Preguntas y Frecuencia Temática</div>
          <div className="analysis-workspace">
            {/* Left Column: Subtopics Breakdown */}
            <aside className="subtopics-panel">
              <div className="panel-header">
                <h3>{currentCourse.title}</h3>
                <p>{currentCourse.desc}</p>
              </div>

              <div className="subtopics-list">
                {Object.entries(currentCourse.subtopics || {}).map(([subKey, count]) => {
                  const isSubSelected = activeSubtopicKey === subKey;
                  const pct = Math.round((count / maxFreq) * 100);
                  return (
                    <div
                      key={subKey}
                      onClick={() => setSelectedSubtopic(subKey)}
                      className={`subtopic-item ${isSubSelected ? 'active' : ''}`}
                    >
                      <div className="subtopic-info">
                        <span className="subtopic-title">{subKey}</span>
                        <span className="subtopic-count">{count}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-bar" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* Right Column: Literal Examples with Options */}
            <main className="examples-panel">
              <div className="examples-header">
                <div>
                  <div className="section-label" style={{ marginBottom: '0.25rem' }}>Subtema Seleccionado</div>
                  <h3>{activeSubtopicKey}</h3>
                </div>
                <span className="source-badge">Archivo Oficial CEU BCRP</span>
              </div>

              {currentCourse.examples && currentCourse.examples[activeSubtopicKey] && currentCourse.examples[activeSubtopicKey].length > 0 ? (
                <div className="examples-container">
                  {currentCourse.examples[activeSubtopicKey].map((ex, idx) => (
                    <div key={idx} className="example-card">
                      <div className="example-meta">
                        <span className="meta-year">Examen CEU {ex.year}</span>
                        <span className="meta-num">Pregunta N° {ex.num}</span>
                      </div>
                      <div className="example-text">
                        <LatexText text={ex.text} />
                      </div>

                      {ex.options && ex.options.length > 0 && (
                        <div className="options-list">
                          {ex.options.map((opt, oIdx) => (
                            <div 
                              key={oIdx} 
                              className={`option-item ${opt.isCorrect ? 'is-correct' : ''}`}
                            >
                              <span className="option-letter">{opt.letter})</span>
                              <span>
                                <LatexText text={opt.text} />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No hay ejemplos registrados en esta vista preliminar.
                </div>
              )}

              <div className="advice-box">
                <strong>Nota metodológica:</strong> Las preguntas correspondientes al tema <em>{activeSubtopicKey}</em> son extraídas del archivo histórico oficial de evaluaciones del BCRP.
              </div>
            </main>
          </div>
        </div>
      )}

      {/* TAB 2: TIMELINE CRONOLÓGICA */}
      {activeTab === 'timeline' && (
        <div>
          <div className="section-label">Selección de Proceso de Admisión</div>
          <div className="timeline-grid">
            {timelineData.map((t) => (
              <button
                key={t.year}
                onClick={() => setSelectedYear(t)}
                className={`timeline-btn ${selectedYear.year === t.year ? 'active' : ''}`}
              >
                <div className="timeline-year">{t.year}</div>
                <div className="timeline-q">{t.q} preguntas</div>
              </button>
            ))}
          </div>

          <div className="timeline-detail">
            <span className="exam-badge" style={{ marginBottom: '0.75rem' }}>Formato: {selectedYear.phase}</span>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem' }}>
              Proceso de Selección CEU {selectedYear.year}
            </h3>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {selectedYear.desc}
            </p>
            <div style={{ display: 'flex', gap: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Duración</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{selectedYear.dur} minutos</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total de Preguntas</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{selectedYear.q} preguntas</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INSIGHTS Y ESTRATEGIA */}
      {activeTab === 'insights' && (
        <div className="strategy-grid">
          <div className="strategy-card">
            <h3>Rigurosidad en Econometría y Series de Tiempo</h3>
            <p>
              A diferencia de otros exámenes, el BCRP no solo evalúa MCO básico, sino que profundiza en violaciones a los supuestos MELI (heterocedasticidad, autocorrelación), pruebas de raíz unitaria (ADF), modelos VAR estructurales y cointegración de Johansen. Es la materia que separa a los becarios.
            </p>
          </div>
          <div className="strategy-card">
            <h3>Dominio de la Política Monetaria del BCRP</h3>
            <p>
              El tema de mayor frecuencia en toda la historia es el esquema de Metas Explícitas de Inflación, la regla de Taylor y las operaciones de mercado abierto. Comprender el mecanismo de transmisión monetaria y el rol del tipo de cambio en economía abierta es indispensable.
            </p>
          </div>
          <div className="strategy-card">
            <h3>Administración del Tiempo por Pregunta</h3>
            <p>
              Con un promedio de 2.2 a 2.5 minutos por pregunta en el formato actual (60 preguntas en 130–150 min), se recomienda resolver las preguntas teóricas conceptuales en menos de 60 segundos, reservando el tiempo extra para el desarrollo de los ejercicios algebraicos econométricos y financieros.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
