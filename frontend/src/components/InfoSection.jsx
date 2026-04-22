export default function InfoSection({ block, reverse, isVisible, direction, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      className={`info-block ${reverse ? "info-block--reverse" : ""} ${
        direction === "right" ? "info-block--from-right" : "info-block--from-left"
      } ${isVisible ? "info-block--visible" : ""}`}
    >
      <div className="info-block__text">
        <h3>{block.title}</h3>
        <p>{block.text}</p>
      </div>
      <div className="info-block__image-wrap">
        <img src={block.image} alt={block.title} className="info-block__image" />
      </div>
    </section>
  );
}
