"""Queryable community/catalog tables, independent of account-state migrations."""
from sqlalchemy import (Boolean, CheckConstraint, Column, ForeignKey, Index,
                        Integer, JSON, MetaData, String, Table, Text)

metadata = MetaData()
songs = Table('catalog_songs', metadata,
    Column('id', String(100), primary_key=True), Column('title', Text, nullable=False),
    Column('artist', Text, nullable=False), Column('instrument', Text, nullable=False),
    Column('level', Integer, nullable=False), Column('key', Text, nullable=False),
    Column('bpm', Integer, nullable=False), Column('cover', Text), Column('date', Text),
    Column('badge', Text), Column('color', Text), Column('style', Text, nullable=False),
    Column('language', Text, nullable=False), Column('tags', JSON, nullable=False),
    Column('types', JSON, nullable=False), Column('home', Boolean, nullable=False),
    Column('demo', Boolean, nullable=False), Column('search_text', Text, nullable=False),
    Column('position', Integer, nullable=False), CheckConstraint('level BETWEEN 1 AND 5'))
arrangements = Table('catalog_arrangements', metadata,
    Column('song_id', String(100), ForeignKey('catalog_songs.id', ondelete='CASCADE'), primary_key=True),
    Column('id', String(100), primary_key=True),
    *[Column(name, Text, nullable=False) for name in (
        'performanceId', 'author', 'avatar', 'instrument', 'type', 'key', 'subtitle',
        'badge', 'description', 'sheet')],
    Column('level', Integer, nullable=False), Column('certified', Boolean, nullable=False),
    Column('authorLevel', Integer), Column('demo', Boolean, nullable=False),
    Column('created_at', Text, nullable=False), CheckConstraint('level BETWEEN 1 AND 5'))
posts = Table('community_posts', metadata,
    Column('id', String(100), primary_key=True),
    Column('song_id', String(100), ForeignKey('catalog_songs.id'), nullable=True),
    Column('uid', String(128), nullable=False), Column('author', Text, nullable=False),
    Column('category', Text, nullable=False), Column('title', Text, nullable=False),
    Column('body', Text, nullable=False), Column('created_at', Text, nullable=False),
    Column('updated_at', Text, nullable=False))
comments = Table('community_comments', metadata,
    Column('id', String(100), primary_key=True),
    Column('post_id', String(100), ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
    Column('parent_id', String(100), ForeignKey('community_comments.id', ondelete='SET NULL')),
    Column('uid', String(128), nullable=False), Column('author', Text, nullable=False),
    Column('text', Text, nullable=False), Column('created_at', Text, nullable=False))


def reaction_table(name, target):
    return Table(name, metadata, Column('uid', String(128), primary_key=True),
        Column('target_id', String(100), ForeignKey(target + '.id', ondelete='CASCADE'), primary_key=True))


post_likes = reaction_table('community_post_likes', 'community_posts')
comment_likes = reaction_table('community_comment_likes', 'community_comments')
bookmarks = reaction_table('community_bookmarks', 'community_posts')
Index('ix_catalog_search', songs.c.search_text)
Index('ix_community_song_date', posts.c.song_id, posts.c.created_at, posts.c.id)
Index('ix_community_posts_uid', posts.c.uid)
Index('ix_community_comments_post', comments.c.post_id, comments.c.created_at, comments.c.id)
