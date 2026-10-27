import PersonLinks from './PersonLinks';
import SiteImage from './SiteImage';

interface BoardMemberData {
  name: string;
  role: string;
  description: string;
  imageSrc: string;
  email?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export default function BoardMember({
  name,
  role,
  description,
  imageSrc,
  email,
  linkedin,
  github,
  website,
}: BoardMemberData) {
  return (
    <article className="board-member">
      {/* Source photos vary in size but render as a fixed 120px square
          (object-fit: cover), so the square keeps layout stable pre-CSS.
          Decorative: the h3 right next to it already announces the name, so
          a non-empty alt would read it twice. An empty image path (headshot
          pending) keeps the circle without a broken <img>. */}
      {imageSrc ? (
        <SiteImage
          className="board-member__avatar"
          src={imageSrc}
          alt=""
          width={120}
          height={120}
        />
      ) : (
        // Headshot pending: an empty circle in the avatar's background color.
        <span className="board-member__avatar" aria-hidden="true" />
      )}
      <div className="board-member__body">
        <div className="board-member__head">
          <h3 className="board-member__name">
            {name}
            {/* Screen readers hear "Name, Role" instead of "vertical line". */}
            <span className="board-member__role">
              <span aria-hidden="true"> | </span>
              <span className="sr-only">, </span>
              {role}
            </span>
          </h3>
        </div>
        {/* Line breaks in the data show as written (white-space: pre-line). */}
        <p className="board-member__description">{description}</p>
        <PersonLinks
          name={name}
          email={email}
          linkedin={linkedin}
          github={github}
          website={website}
          classPrefix="board-member"
        />
      </div>
    </article>
  );
}
