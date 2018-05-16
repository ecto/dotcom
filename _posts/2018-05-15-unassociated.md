---
layout: post
title: Unassociated records in Rails 5
date: 2018-05-15
---

Recently I was working on a Rails project, and stumbled upon an interesting and hard-to-gooogle problem. I was looking for how to load records with the absense of an association, but the answers I was finding on StackOverflow we inadequate. I finally stumbled on the solution, and thought I should share for the next person.

I have two models, `User` and `Post`.

```ruby
class User < ApplicationRecord
  has_one :post
end

class Post < ApplicationRecord
  belongs_to :user
end
```

The `Post` table holds the foreign key, and I want it to because in the future, the `has_one` could turn into a `has_many`.

```sql
select table_name, column_name
from information_schema.columns
where table_name = 'users' or table_name = 'posts';

 table_name | column_name
------------+-------------
 users      | id
 users      | email
 users      | password
 users      | created_at
 users      | updated_at
 posts      | id
 posts      | user_id
 posts      | created_at
 posts      | updated_at
```

Now the problem comes because I allow the `user_id` association on `posts` to be null, and at a certain point I want to associate a `Post` with the first `User` that doesn't have one. Since the foreign key rightly lives on the `Post` we can't just search on the null column:

```ruby
user = User.where(post_id: nil).first
```

To solve this, we could just list all `User`s, excluding those which have been associated with:

```ruby
user = User.where("id not in (select distinct(user_id) from posts)").first
# could also be expressed as
user = User.where("id not in (?)", Post.pluck(:user_id)).first
```

This can work on a mature table, but has a serious edge case: if I don't have any rows in `posts` with a `user_id`, it returns no results! Let's take a closer look at the query this generates to learn why:

```sql
SELECT  "users".* FROM "users"
WHERE (id not in (select distinct(user_id) from posts))
ORDER BY "users"."id" ASC LIMIT $1  [["LIMIT", 1]]
```

The subquery to gather `user_id`s to exclude, `select distinct(user_id) from posts` can return `NULL` given now rows, which in the context of the `not in` in the larger query makes no sense, and so no rows are returned.

Rather than living with a chicken and egg problem, we can use an outer join to get `User` rows matching our criteria:

```sql
select * from users
left join posts on posts.user_id = users.id
where posts.user_id is null;
```

In Rails 4, we would have to manually write this SQL:

```ruby
User.join('left outer join posts on posts.user_id = users.id')
  .where(posts: {user_id: nil})
  .first
```

but Rails 5 makes this a little cleaner, and quite readble in my opinion:

```ruby
User.left_join(:posts)
  .where(posts: {user_id: nil})
  .first
```

Hopefully somebody will find this useful!

In the future, I hope we could get a further shorthand to drop the `left_join` and `where`, maybe `without`, which could give us:

```ruby
User.without(:post).first
```

Maybe I should pull request Rails, but dinner is getting cold.

Cam
