// Botcamp's Testimonials fetches each member from /api/members/<slug> in the
// browser; this site has no such API, so the page reads them on the server
// (outside the client component, hence this separate module) and passes them in.
export const TESTIMONIAL_MEMBER_SLUGS = ["wan-hong-lau", "tobias-rethmeyer", "viktoria-tsybko"]

export interface TestimonialMember {
  slug: string
  name: string
  avatarURL: string | null
}
