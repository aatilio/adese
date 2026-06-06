import React from 'react';

export default function CourseCard({
  onClick,
  tagIcon: TagIcon,
  tagLabel,
  title,
  docente,
  actions,
  stats,
  cardClass = "card tp-course-card",
  tagClass = "tp-course-card__tag",
  labelClass = "tp-course-card__label",
  nameClass = "tp-course-card__name",
}) {
  return (
    <div className={cardClass} onClick={onClick}>
      <div className={`${cardClass.split(' ').pop()}__header`}>
        <div>
          <div className={tagClass}>
            {TagIcon && <TagIcon size={18} />}
            <span className={labelClass}>{tagLabel}</span>
          </div>
          <h3 className={nameClass}>{title}</h3>
          {docente && (
             <div className={`${cardClass.split(' ').pop()}__docente`} title={`Propietario: ${docente.nombre}`}>
               <span className={`${cardClass.split(' ').pop()}__docente-label`}>Docente:</span>
               {docente.codigo}
             </div>
          )}
        </div>
        {actions && <div className={`${cardClass.split(' ').pop()}__actions`}>{actions}</div>}
      </div>
      {stats && <div className={`${cardClass.split(' ').pop()}__stats`}>{stats}</div>}
    </div>
  );
}
